# QA · Poseidon

Documentación de pruebas del sistema Poseidon (asesor de rotación de cultivos).

| Orden | Documento | Para qué sirve |
|---|---|---|
| 1 | [01_Test_Plan.md](01_Test_Plan.md) | Plan de pruebas (IEEE 829): alcance, estrategia, ambiente, datos, criterios de entrada/salida, defectos, riesgos y cronograma |
| 2 | [02_High_Level_Test_Cases.md](02_High_Level_Test_Cases.md) | 54 escenarios de alto nivel por módulo, prueba de humo, trazabilidad HU → casos y matriz rol × vista |
| 3 | [03_Test_Cases.md](03_Test_Cases.md) | 161 casos detallados en formato estándar (precondiciones, datos, pasos con resultado esperado) |
| 3 | [03_Test_Cases.csv](03_Test_Cases.csv) | Los mismos 161 casos como hoja de ejecución para Excel (separador `;`, UTF-8), con columnas de resultado obtenido, estado, ejecutor, fecha y defecto |

## Cómo usarlo

1. Preparar el ambiente y los datos (plan, secciones 7 y 8).
2. Ejecutar la **prueba de humo** (lista en el documento de alto nivel) y `cd Backend && npm test`.
3. Ejecutar los casos detallados registrando el resultado en el CSV (Estado: Pass / Fail / Blocked / No ejecutado).
4. Reportar defectos con la plantilla de la sección 12 del plan e indicar el ID del caso.
5. Cerrar con un informe de resultados (`04_Test_Summary_Report.md`) usando las métricas de la sección 13.
