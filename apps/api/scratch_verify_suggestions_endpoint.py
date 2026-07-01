import os
import sys
import time

# Asegurar que el path del backend está en sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_suggestions(query: str):
    print(f"\n========================================")
    print(f"Probando endpoint con query: '{query}'")
    print(f"========================================")
    
    start_time = time.time()
    response = client.get("/api/v1/search/suggestions", params={"query": query})
    elapsed = (time.time() - start_time) * 1000
    
    print(f"Código de respuesta: {response.status_code}")
    print(f"Tiempo transcurrido: {elapsed:.2f} ms")
    
    if elapsed >= 500:
        print("ADVERTENCIA: El tiempo de respuesta superó el límite de 500ms!")
    else:
        print("OK: Tiempo de respuesta dentro del límite (<500ms)")
        
    data = response.json()
    suggestions = data.get("suggestions", [])
    print(f"Número de sugerencias obtenidas: {len(suggestions)}")
    
    for idx, s in enumerate(suggestions, 1):
        print(f"  {idx}. Label: '{s.get('label')}'")
        print(f"     Query: '{s.get('query')}'")
        
    # Validaciones básicas
    assert response.status_code == 200, f"Se esperaba status 200, se obtuvo {response.status_code}"
    assert isinstance(suggestions, list), "Sugerencias debe ser una lista"
    assert len(suggestions) <= 6, "Se obtuvieron más de 6 sugerencias!"
    
    # Comprobar que no hay duplicados por label
    labels = [s.get('label') for s in suggestions]
    assert len(labels) == len(set(labels)), "Hay duplicados en los labels de las sugerencias!"
    
    print("Validaciones del test exitosas.")

if __name__ == "__main__":
    try:
        # Test 1: Búsqueda regular
        test_suggestions("Ralph Lauren Polo Blue EDT 100 ml")
        
        # Test 2: Búsqueda sin marca en el query original (debería resolver la marca si la detecta en los productos)
        test_suggestions("Acqua di Gio 75ml")
        
        # Test 3: Búsqueda sin volumen ni concentración original
        test_suggestions("Dior Sauvage")
        
        # Test 4: Búsqueda vacía (debe retornar sugerencias vacías sin error)
        test_suggestions("")
        
        # Test 5: Búsqueda de un producto inexistente
        test_suggestions("FraganciaInexistenteSuperRaraQueNoExiste123")
        
        print("\n¡Todos los tests pasaron exitosamente!")
    except AssertionError as e:
        print(f"\nFallo en el test: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nError inesperado en los tests: {e}")
        sys.exit(1)
