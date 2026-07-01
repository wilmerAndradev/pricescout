import os
import uvicorn

# Cargar variables de entorno de .env.local
env_path = os.path.join(os.path.dirname(__file__), "..", "web", ".env.local")
if os.path.exists(env_path):
    print(f"Cargando variables de entorno desde {env_path}")
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                # Remover comillas si existen en los extremos del valor
                val = v.strip()
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                os.environ[k.strip()] = val

if __name__ == "__main__":
    # Asegurar que PYTHONPATH apunte al directorio de la API
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
