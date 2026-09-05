import sys, os
sys.path.insert(0, r'd:\projects\DiodeGuard\backend\app')

try:
    import main
    orch = main.get_orchestrator()
    print("Orchestrator loaded successfully!")
    print("Health:", orch.get_health_api())
except Exception as e:
    import traceback
    traceback.print_exc()
