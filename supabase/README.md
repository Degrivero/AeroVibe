# Supabase – esquema y migraciones

## migrations/

Contienen el **historial del esquema** de la base (tablas, RLS, funciones, etc.). Aunque ya hayas aplicado todo en tu proyecto actual, conviene **no borrarlas** porque:

- Sirven de **referencia** del estado de la BD.
- Son necesarias para **nuevos entornos** (otro proyecto Supabase, staging, etc.) con `supabase db push` o aplicándolas en orden.
- Documentan **qué cambios se hicieron y cuándo**.

Si no usás la CLI de Supabase ni volvés a aplicar migraciones, podés ignorar esta carpeta; no afecta el funcionamiento del backend. Si en el futuro necesitás replicar el esquema, acá está el source of truth.

## .temp/

Archivos generados por la CLI de Supabase (versiones, refs). Se pueden ignorar o borrar; la CLI los regenera.
