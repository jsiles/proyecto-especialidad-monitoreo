comandos exec docker sqlite

node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');console.log(db.pragma('wal_checkpoint(TRUNCATE)'))"

Sí. Para resetear solo metrics_cache puedes vaciarla con:

 node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');const info=db.prepare('DELETE FROM metrics_cache').run();console.log(info)"

Si además quieres compactar el archivo WAL después:

 node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');db.prepare('DELETE FROM metrics_cache').run();console.log(db.pragma('wal_checkpoint(TRUNCATE)'))"

 Para ver los últimos 10 registros de metrics_cache:

 node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');const rows=db.prepare('SELECT id, server_id, metric_type, value, timestamp FROM metrics_cache ORDER BY timestamp DESC LIMIT 10').all();console.table(rows)"

Si quieres ver solo el timestamp y servidor:

 node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');const rows=db.prepare('SELECT server_id, metric_type, timestamp FROM metrics_cache ORDER BY timestamp DESC LIMIT 10').all();console.table(rows)"

copiar desde contenedor a host
docker cp monitoring-backend:/app/data/monitoring.db /Users/siles/Desktop/monitoring.db

node -e "const Database=require('better-sqlite3');const db=new Database('/app/data/monitoring.db');const rows=db.prepare('select * from alert_thresholds WHERE enabled= 1 order by created_at desc LIMIT 10').all();console.table(rows)"

Utilizando una imagen sqlite

docker run --rm -it   --volumes-from monitoring-backend   keinos/sqlite3   sqlite3 /app/data/monitoring.db "SELECT * FROM alert_thresholds ORDER BY created_at DESC LIMIT 10;"

docker run --rm -it   --volumes-from monitoring-backend   keinos/sqlite3   sqlite3 /app/data/monitoring.db "SELECT * FROM metrics_cache ORDER BY timestamp DESC LIMIT 10;"