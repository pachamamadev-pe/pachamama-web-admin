# Prevención de Console Ninja

## ⚠️ Importante: Extensión Console Ninja Removida

La extensión **Console Ninja** (`wallabyjs.console-ninja`) fue removida del proyecto en el commit anterior.

### ¿Por qué fue removida?

Esta extensión inyectaba código de instrumentación en los archivos TypeScript durante el desarrollo, que incluía:

1. **Bloques de código ofuscado** al final de cada archivo (~3000 líneas)
2. **Modificaciones en el código fuente** envolviendo `console.log()` y `console.error()` con funciones de rastreo
3. **Conexiones WebSocket** hardcodeadas a `ws://127.0.0.1:56870` que fallaban para otros desarrolladores
4. **Rutas específicas del usuario** que no eran portables

### Archivos afectados (18 total)

- `src/main.ts`
- Core: `auth.service.ts`, `sidebar.service.ts`, `notification.service.ts`, `file-upload.service.ts`, `http-error.interceptor.ts`, `header.component.ts`
- Features: `login.page.ts`, `companies.page.ts`, `company-form.component.ts`, `company-documents-dialog.component.ts`, `products.page.ts`, `profile.page.ts`, `projects.page.ts`, `project-form.component.ts`
- Shared: `change-password-dialog.component.ts`, `file-upload.component.ts`, `image-upload.component.ts`

### Código removido

#### EOF Instrumentation Blocks

```typescript
/* istanbul ignore next */ /* c8 ignore start */ /* eslint-disable */ function oo_cm() { ... }
/* istanbul ignore next */ function oo_oo(i: string, ...v: any[]) { ... }
/* istanbul ignore next */ function oo_tx(i: string, ...v: any[]) { ... }
// ... más funciones de rastreo
```

#### Source Code Modifications

```typescript
// ❌ Antes (con Console Ninja)
console.error(...oo_tx(`3369111778_5_52_5_70_11`, err));
console.log(...oo_oo(`44424303_178_6_178_65_4`, 'Message:', data));

// ✅ Después (código limpio)
console.error(err);
console.log('Message:', data);
```

### Prevención futura

1. **NO instalar Console Ninja** en VS Code
2. El archivo `.vscode/settings.json` está configurado para prevenir instalaciones automáticas
3. El archivo `.vscode/extensions.json` solo recomienda `angular.ng-template`
4. Si necesitas debugging avanzado, usa:
   - **Chrome DevTools** (integrado con Angular)
   - **VS Code Debugger** (configurado en `.vscode/launch.json`)
   - **Angular DevTools** extension (oficial de Angular)

### Extensiones recomendadas seguras

- `angular.ng-template` - Angular Language Service (oficial)
- `esbenp.prettier-vscode` - Formateo de código
- `dbaeumer.vscode-eslint` - Linting
- `Angular.ng-template` - Angular snippets

### ¿Qué hacer si aparece código de Console Ninja nuevamente?

1. **NO hacer commit** del código contaminado
2. Ejecutar: `git restore .` para revertir cambios
3. Desinstalar la extensión Console Ninja de VS Code
4. Reiniciar VS Code
5. Verificar con: `git diff` que no haya código extraño

### Verificación

Para verificar que el código está limpio, ejecutar:

```bash
# Buscar funciones de Console Ninja
grep -r "oo_tx\|oo_oo\|oo_cm" src/

# Buscar referencias al puerto WebSocket
grep -r "56870" src/

# Buscar bloques de instrumentación
grep -r "console_ninja\|istanbul ignore next" src/
```

Todos estos comandos deben retornar **cero resultados**.

---

**Fecha de limpieza:** 23 de noviembre de 2025  
**Archivos limpiados:** 18 archivos TypeScript  
**Código removido:** ~54,000 líneas de instrumentación
