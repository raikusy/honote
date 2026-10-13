#!/bin/bash
if [ ! -s /data/db/keyfile ]; then
  dd if=/dev/urandom bs=756 count=1 status=none | base64 -w 0 > /data/db/keyfile
  chmod 400 /data/db/keyfile
fi
chown mongodb:mongodb /data/db/keyfile
docker-entrypoint.sh mongod --replSet rs0 --bind_ip_all --keyFile /data/db/keyfile &
child=$!
trap 'kill "$child"; wait "$child"' TERM INT
for _ in $(seq 1 90); do
  if mongosh --quiet --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval 'try { if (rs.status().myState === 1) quit(0); quit(1); } catch (e) { if (e.code === 94) rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] }); quit(1); }'; then
    break
  fi
  sleep 1
done
wait "$child"
