import urllib.request

url = "https://articulo.mercadolibre.cl/MLC-1436444641-iphone-13-128-gb-blanco-estelar-_JM"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
})

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        with open('ml_output.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("HTML saved to ml_output.html")
except Exception as e:
    print("Error:", e)
