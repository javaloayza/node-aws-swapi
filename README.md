# Star Wars Weather Fusion API - Challenge

Una API RESTful que fusiona datos de personajes de Star Wars (SWAPI) con información meteorológica actual (OpenWeatherMap) de sus planetas natales, creando una experiencia única de datos interrelacionados.

## 🚀 Instalación y Configuración

### Requisitos Previos
- **Node.js** versión 20.x (requerimiento del challenge)
- **npm** >= 8.x  
- **AWS CLI** configurado (opcional, solo para deploy)

### ⭐ Prueba Rápida - API en Producción (Recomendado)

**Para evaluación inmediata sin configuración local:**

```
Base URL: https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/
```

La API está completamente desplegada y funcional en AWS. Ideal para pruebas y evaluación del challenge.

---

## 🌐 Acceso a la API Desplegada

La API ya está desplegada en AWS y puede acceder a ella a través las siguientes URLs específicas:

### Endpoints de Fusión
- Fusión básica (Luke Skywalker): `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/fusion`
- Fusión con personaje específico: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/fusion?character=10`

### Endpoints de Almacenamiento
- Almacenar datos personalizados (POST): `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/store`

### Endpoints de Historial
- Historial completo: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/history`
- Solo datos de fusión: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/history?source=fusion`
- Solo datos personalizados: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/history?source=custom`
- Con paginación y límite: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/history?source=all&limit=5`

### Documentación
- Acceder a la documentación interactiva: `https://0zefko7ls6.execute-api.us-east-1.amazonaws.com/dev/docs`

> **💡 Consejo:** Esta versión desplegada es la recomendada para pruebas y evaluación del proyecto, ya que evita los posibles problemas que pueden surgir en entornos locales por restricciones entre AWS y el SO.

---

## 📚 Detalles de la documentación

- **API:** Disponible en `/docs` una vez desplegado
- **Código:** Documentado con JSDoc en cada archivo
- **Swagger:** Especificación OpenAPI 3.0.3

## 🌟 Características Principales

- **APIs Externas:** Integración SWAPI + OpenWeatherMap con fusión inteligente de datos
- **Serverless AWS:** Lambda + API Gateway + DynamoDB con arquitectura escalable  
- **Cache DynamoDB:** TTL de 30 minutos para optimización de costos y rendimiento
- **Rate Limiting:** Protección 100 req/hora con middleware personalizado
- **TypeScript + Jest:** Tipado estático completo con 10/10 tests automatizados
- **Swagger OpenAPI:** Documentación interactiva profesional en `/docs`
- **CloudWatch Logging:** Monitoreo estructurado con métricas de performance

## 🚀 Endpoints

### `GET /fusion`

Fusiona datos de un personaje de Star Wars con información meteorológica.

#### Parámetros

- `character` (opcional): ID del personaje (1-83), default: 1 (Luke Skywalker)

#### Ejemplo de respuesta

```json
{
  "success": true,
  "data": {
    "character": {
      "id": "1",
      "name": "Luke Skywalker",
      "height": 172,
      "mass": 77,
      "hairColor": "blond",
      "eyeColor": "blue",
      "birthYear": "19BBY",
      "gender": "male"
    },
    "homeworld": {
      "id": "1",
      "name": "Tatooine",
      "climate": "arid",
      "terrain": "desert"
    },
    "weather": {
      "location": "Tatooine",
      "country": "Galaxy Far Far Away",
      "temperature": 28,
      "feelsLike": 32,
      "humidity": 45,
      "conditions": "Clear sky",
      "source": "OPENWEATHERMAP",
      "isFallback": false
    },
    "fusion": {
      "summary": "Luke Skywalker from Tatooine - Currently Clear sky",
      "compatibility": "perfect match"
    }
  },
  "meta": {
    "timestamp": "2024-07-02T18:23:41Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0",
    "cached": false
  }
}
```

### `POST /store`

Almacena datos personalizados en el sistema.

#### Body

```json
{
  "data": {
    "message": "Mi mensaje personalizado",
    "timestamp": "2024-01-15T10:30:00Z",
    "preferences": {
      "theme": "dark",
      "language": "es"
    }
  },
  "metadata": {
    "category": "user-preferences",
    "version": "1.0"
  }
}
```

### `GET /history`

Consulta el historial de datos almacenados con filtros y paginación.

#### Parámetros

- `source` (opcional): Filtrar por tipo (`fusion`, `custom`, `all`). Default: `all`
- `limit` (opcional): Número máximo de elementos (1-100). Default: 10
- `lastEvaluatedKey` (opcional): Clave para paginación
- `startTime` (opcional): Filtrar desde esta fecha (timestamp)
- `endTime` (opcional): Filtrar hasta esta fecha (timestamp)

### `GET /docs`

Documentación interactiva con Swagger UI.

## 🛡️ Rate Limiting

La API implementa límites de tasa para proteger contra abusos:

- **100 solicitudes por hora** por IP/cliente para cada endpoint
- Las solicitudes que excedan el límite recibirán una respuesta `429 Too Many Requests`
- El límite se restaura automáticamente después del período de ventana

## 🔧 Tecnologías

- **AWS Lambda:** Serverless compute para los endpoints
- **API Gateway:** Gestión y exposición de la API
- **DynamoDB:** Almacenamiento NoSQL con TTL automático
- **Node.js:** Runtime en versión 20.x
- **TypeScript:** Tipado estático para desarrollo robusto
- **Serverless Framework:** Infraestructura como código
- **Jest:** Testing automatizado

## 💻 Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/node-aws-swapi.git
cd node-aws-swapi

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (puerto 3030)
npm run dev

# Ejecutar tests
npm test

# Compilar TypeScript
npm run build

# Desplegar a AWS
npm run deploy
```

> **⚠️ Importante:** Después de ejecutar `npm run deploy`, pueden surgir conflictos de puertos que afecten la ejecución local de `npm run dev` debido a que algunos procesos quedan ejecutándose en segundo plano y mantienen los puertos asignados. Si experimenta problemas con el servidor local (como errores EADDRINUSE), se recomienda reiniciar la terminal o probar la aplicación directamente en AWS desde la API desplegada donde  funciona de manera estable.

## 📝 Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```
OPENWEATHER_API_KEY=your_api_key_here
JWT_SECRET=your_secret_key_here
LOG_LEVEL=info
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MINUTES=60
```

> **Nota:** Para facilitar la evaluación del challenge, las credenciales están hardcodeadas en `serverless.yml` y `src/utils/constants.ts`. En proyectos reales, todas las claves y secretos deben configurarse desde variables de entorno (.env, AWS Secrets Manager, etc.).

## 🔒 Seguridad

- **Rate Limiting:** Protección contra ataques DDoS
- **Validación de entrada:** Prevención de inyecciones
- **CORS configurado:** Acceso controlado desde navegadores
- **Headers seguros:** Protección XSS y otras vulnerabilidades


## 📄 Licencia

MIT - Ver [LICENSE](LICENSE) para más detalles.

## 👤 Autor

- **Aldo Loayza**
