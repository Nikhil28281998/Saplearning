import sqlite3, csv, uuid

conn = sqlite3.connect('db.sqlite')
cur = conn.cursor()

# Get 10 trainings without commas in title (simpler CSV)
cur.execute("SELECT ID, title, role, sap_module, url FROM Learning_Data_Trainings WHERE title NOT LIKE '%,%' LIMIT 10")
trainings = cur.fetchall()

statuses = ['Assigned','In Progress','Completed','Assigned','In Progress','Assigned','Completed','In Progress','Assigned','Assigned']
due_dates = ['2026-06-30T00:00:00Z','2026-04-15T00:00:00Z','2026-03-01T00:00:00Z','2026-07-31T00:00:00Z','2026-05-15T00:00:00Z','2026-02-15T00:00:00Z','2026-01-31T00:00:00Z','2026-08-31T00:00:00Z','2026-09-30T00:00:00Z','2026-03-15T00:00:00Z']
comp_dates = ['','','2026-02-20T00:00:00Z','','','','2026-01-25T00:00:00Z','','','']

with open('db/data/Learning_Data-TrainingAssignments.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['ID','trainingId','userId','userName','userEmail','title','role','sap_module','url','dueDate','status','completionDate','assignedBy','assignedByName','managerSort2'])
    for i, t in enumerate(trainings):
        w.writerow([
            str(uuid.uuid4()), t[0],
            'USER001' if i < 5 else 'USER002',
            'Test User' if i < 5 else 'Jane Smith',
            'user@test.com' if i < 5 else 'jane@test.com',
            t[1], t[2], t[3], t[4],
            due_dates[i], statuses[i], comp_dates[i],
            'MGR001', 'Manager', 'MGR001'
        ])

print(f"Wrote {len(trainings)} assignments")
conn.close()
