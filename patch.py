import os

main_path = r'd:\projects\DiodeGuard\backend\app\main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    text = f.read()

target1 = "dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'combinenew.csv'))"
replace1 = """dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'combinenew.csv'))
        if not os.path.exists(dataset_path):
            dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))"""

text = text.replace(target1, replace1)

with open(main_path, 'w', encoding='utf-8') as f:
    f.write(text)

orch_path = r'd:\projects\DiodeGuard\backend\app\orchestrator.py'
with open(orch_path, 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace("df = pd.read_csv(self.dataset_path, nrows=2000)", 
    """if not os.path.exists(self.dataset_path):
            self.dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'datasets', 'sample_traffic.csv'))
        df = pd.read_csv(self.dataset_path, nrows=2000)""")

with open(orch_path, 'w', encoding='utf-8') as f:
    f.write(text2)
