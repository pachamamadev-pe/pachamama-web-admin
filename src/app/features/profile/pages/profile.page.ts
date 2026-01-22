import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { UsersService } from '@app/shared/services/users.service';
import { SidebarService } from '@app/core/services/sidebar.service';
import { NotificationService } from '@app/core/services';
import { UserDetails } from '@app/shared/models/user-details.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { AzureStorageService } from '@core/services/azure-storage.service';
import { UploadResult } from '@core/services/file-upload.service';
import {
  Auth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';
import { HeroSectionComponent } from '@app/shared/components/hero-section/hero-section.component';

/**
 * Página de Perfil del Usuario
 * Gestión completa de datos personales, avatar y seguridad
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    ImageUploadComponent,
    HeroSectionComponent,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export default class ProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);
  private auth = inject(Auth);
  private azureStorage = inject(AzureStorageService);

  // Estado
  userDetails = signal<UserDetails | null>(null);
  isLoadingProfile = signal(true);
  isEditingPersonalInfo = signal(false);
  isSavingPersonalInfo = signal(false);
  isChangingPassword = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // Avatar state
  avatarPreview = signal<string | null>(null);
  private imageUrlCache = signal<Map<string, string>>(new Map());
  private uploadedAvatarPath: string | null = null;

  // Tipos de documento
  documentTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carnet de Extranjería' },
    { value: 'PASSPORT', label: 'Pasaporte' },
  ];

  // Formulario de Información Personal
  personalInfoForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    documentType: ['DNI', Validators.required],
    documentNumber: ['', Validators.required],
  });

  // Formulario de Cambio de Contraseña
  passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Carga el perfil del usuario desde el backend
   */
  private loadUserProfile(): void {
    const userId = this.sidebarService.userId();
    if (!userId) {
      this.notificationService.error('No se pudo obtener el ID del usuario');
      this.isLoadingProfile.set(false);
      return;
    }

    this.usersService.getUserDetails(userId).subscribe({
      next: (details) => {
        this.userDetails.set(details);
        this.populatePersonalInfoForm(details);
        this.loadAvatarUrl(details.avatarUrl);

        // Propagar avatar URL al SidebarService
        this.sidebarService.updateAvatarUrl(details.avatarUrl || null);

        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar el perfil del usuario');
        this.isLoadingProfile.set(false);
      },
    });
  }

  /**
   * Carga la URL del avatar con SAS token de Azure Storage
   */
  private loadAvatarUrl(avatarPath: string | null): void {
    if (!avatarPath) {
      this.avatarPreview.set(null);
      return;
    }

    // Verificar si ya está en caché
    const cache = this.imageUrlCache();
    if (cache.has(avatarPath)) {
      this.avatarPreview.set(cache.get(avatarPath)!);
      return;
    }

    // Obtener SAS token desde Azure Storage
    this.azureStorage.getFileUrl(avatarPath, 5).subscribe({
      next: (url) => {
        // Actualizar caché
        this.imageUrlCache.update((currentCache) => {
          const newCache = new Map(currentCache);
          newCache.set(avatarPath, url);
          return newCache;
        });
        this.avatarPreview.set(url);
      },
      error: () => {
        // Si falla, mostrar null (avatar por defecto)
        this.avatarPreview.set(null);
      },
    });
  }

  /**
   * Puebla el formulario con los datos del usuario
   */
  private populatePersonalInfoForm(details: UserDetails): void {
    this.personalInfoForm.patchValue({
      firstName: details.firstName,
      lastName: details.lastName,
      phone: details.phone || '',
      documentType: details.documentType,
      documentNumber: details.documentNumber,
    });
    this.personalInfoForm.disable();
  }

  /**
   * Habilita la edición de información personal
   */
  enableEditing(): void {
    this.isEditingPersonalInfo.set(true);
    this.personalInfoForm.enable();
  }

  /**
   * Cancela la edición y restaura los valores originales
   */
  cancelEditing(): void {
    this.isEditingPersonalInfo.set(false);
    const details = this.userDetails();
    if (details) {
      this.populatePersonalInfoForm(details);
    }
  }

  /**
   * Guarda los cambios en la información personal
   */
  savePersonalInfo(): void {
    if (this.personalInfoForm.invalid) {
      this.personalInfoForm.markAllAsTouched();
      return;
    }

    this.isSavingPersonalInfo.set(true);
    const userId = this.sidebarService.userId();
    const formData = this.personalInfoForm.getRawValue();

    this.usersService.updateUser(userId, formData).subscribe({
      next: () => {
        this.notificationService.success('Información personal actualizada correctamente');

        // Recargar el perfil completo desde el backend
        this.usersService.getUserDetails(userId).subscribe({
          next: (details) => {
            this.userDetails.set(details);
            this.populatePersonalInfoForm(details);
            this.isEditingPersonalInfo.set(false);
            this.personalInfoForm.disable();
            this.isSavingPersonalInfo.set(false);
          },
          error: () => {
            this.isSavingPersonalInfo.set(false);
          },
        });
      },
      error: () => {
        this.notificationService.error('Error al actualizar la información personal');
        this.isSavingPersonalInfo.set(false);
      },
    });
  }

  /**
   * Maneja cuando se sube una nueva imagen del avatar
   */
  onImageUploaded(result: UploadResult): void {
    // Guardar el path relativo devuelto por el componente
    this.uploadedAvatarPath = result.relativePath;

    // Actualizar el avatar en el backend
    const userId = this.sidebarService.userId();
    if (!userId) return;

    this.usersService.updateAvatar(userId, result.relativePath).subscribe({
      next: () => {
        this.notificationService.success('Avatar actualizado correctamente');

        // Propagar el cambio del avatar al SidebarService
        this.sidebarService.updateAvatarUrl(result.relativePath);

        // Recargar el perfil completo desde el backend
        this.usersService.getUserDetails(userId).subscribe({
          next: (details) => {
            this.userDetails.set(details);
            this.loadAvatarUrl(result.relativePath);
          },
          error: (error) => {
            console.error('Error al recargar perfil:', error);
          },
        });
      },
      error: (error) => {
        console.error('Error al actualizar avatar:', error);
        this.notificationService.error('Error al actualizar el avatar');
      },
    });
  }

  /**
   * Maneja cuando se elimina la imagen del avatar
   */
  onImageRemoved(): void {
    this.uploadedAvatarPath = null;
    this.avatarPreview.set(null);

    // Actualizar en el backend
    const userId = this.sidebarService.userId();
    if (!userId) return;

    this.usersService.updateAvatar(userId, null).subscribe({
      next: () => {
        this.notificationService.success('Avatar eliminado correctamente');

        // Propagar la eliminación del avatar al SidebarService
        this.sidebarService.updateAvatarUrl(null);

        // Recargar el perfil completo desde el backend
        this.usersService.getUserDetails(userId).subscribe({
          next: (details) => {
            this.userDetails.set(details);
          },
          error: (error) => {
            console.error('Error al recargar perfil:', error);
          },
        });
      },
      error: (error) => {
        console.error('Error al eliminar avatar:', error);
        this.notificationService.error('Error al eliminar el avatar');
      },
    });
  }

  /**
   * Obtiene la URL del avatar con SAS token desde la caché
   */
  getAvatarImageUrl(avatarPath: string | null | undefined): string | null {
    if (!avatarPath) return null;

    const cache = this.imageUrlCache();
    if (cache.has(avatarPath)) {
      return cache.get(avatarPath)!;
    }

    // Si no está en caché, solicitarlo
    this.azureStorage.getFileUrl(avatarPath, 5).subscribe({
      next: (url) => {
        this.imageUrlCache.update((currentCache) => {
          const newCache = new Map(currentCache);
          newCache.set(avatarPath, url);
          return newCache;
        });
      },
    });

    return null; // Mientras carga
  }

  /**
   * Cambia la contraseña del usuario
   */
  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuario no autenticado');
      }

      // Reautenticar con la contraseña actual
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Actualizar contraseña en Firebase
      await updatePassword(currentUser, newPassword);

      // Marcar contraseña como cambiada en BD
      await this.usersService.markPasswordChanged().toPromise();

      // Actualizar signal en SidebarService
      this.sidebarService.isPasswordChanged.set(true);

      this.notificationService.success('Contraseña actualizada correctamente');
      this.passwordForm.reset();
      this.isChangingPassword.set(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && error.message.includes('wrong-password')
          ? 'La contraseña actual es incorrecta'
          : 'Error al cambiar la contraseña. Por favor, intenta nuevamente.';
      this.notificationService.error(errorMessage);
      this.isChangingPassword.set(false);
    }
  }

  /**
   * Validador personalizado para verificar que las contraseñas coincidan
   */
  private passwordMatchValidator(group: import('@angular/forms').AbstractControl) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  /**
   * Alternar visibilidad de contraseñas
   */
  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword.update((show) => !show);
        break;
      case 'new':
        this.showNewPassword.update((show) => !show);
        break;
      case 'confirm':
        this.showConfirmPassword.update((show) => !show);
        break;
    }
  }

  /**
   * Obtiene las iniciales del usuario para el avatar placeholder
   */
  getUserInitials(): string {
    const details = this.userDetails();
    if (!details) return '';
    return `${details.firstName.charAt(0)}${details.lastName.charAt(0)}`.toUpperCase();
  }
}
