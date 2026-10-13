#!/bin/bash
mongosh --quiet --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval 'quit(rs.status().myState === 1 ? 0 : 1)'
