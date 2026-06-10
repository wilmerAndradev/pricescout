import subprocess

try:
    # Capture all docker logs
    out = subprocess.check_output("docker logs pricescout_worker", shell=True).decode("utf-8")
    lines = out.splitlines()
    
    with open("scratch_output.txt", "w", encoding="utf-8") as f:
        f.write("--- Recent 200 lines from Celery worker ---\n")
        f.write("\n".join(lines[-200:]))
        f.write("\n\n--- Search tasks status lines ---\n")
        status_lines = [l for l in lines if "scrape_store_search_task" in l or "run_autonomous_search" in l or "search_complete" in l]
        f.write("\n".join(status_lines[-100:]))
        
    print("Logs saved successfully to scratch_output.txt")
except Exception as e:
    print("Error:", e)
