import os
import pymongo
import hashlib
from dotenv import load_dotenv

load_dotenv()

# DATABASE CONNECTION
#---------------------------------------------------------------------------

def get_db_connection():
    # Connection string from environment variable
    connection_string = os.getenv("MONGO_URI")
    if not connection_string:
        print("MONGO_URI not found in .env file")
        return None
    
    connection_string = connection_string.strip().strip('"').strip("'")
    # Debug: Print first few chars to check scheme
    print(f"DB: Attempting to connect to: {connection_string[:15]}...")

    try:
        # Increase timeout and handle potential DNS/Net errors
        client = pymongo.MongoClient(connection_string, serverSelectionTimeoutMS=2000, tlsAllowInvalidCertificates=True)
        # Verify connection
        client.admin.command('ping')
        db = client["TrunkRTNBCI"] # Database name
        print("DB: Successfully connected to MongoDB")
        return db
    except Exception as e:
        print(f"DB: Failed to connect to MongoDB: {e}")
        return None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(stored_password, provided_password):
    return stored_password == hash_password(provided_password)

def check_password_strength(password):
    score = 0
    if len(password) >= 8: score += 1
    if any(c.isupper() for c in password): score += 1
    if any(c.islower() for c in password): score += 1
    if any(c.isdigit() for c in password): score += 1
    if any(not c.isalnum() for c in password): score += 1
    if score < 3: return "weak"
    elif score < 5: return "medium"
    else: return "strong"
    
import json

DB_FILE = "users.json"

def save_user_local(username, password, email, name):
    try:
        users = {}
        if os.path.exists(DB_FILE):
            with open(DB_FILE, 'r') as f:
                users = json.load(f)
        
        if username in users:
            return False
            
        hashed = hash_password(password)
        users[username] = {
            "password": hashed,
            "email": email,
            "name": name
        }
        
        with open(DB_FILE, 'w') as f:
            json.dump(users, f)
        return True
    except Exception as e:
        print(f"Local DB Error: {e}")
        return False

def authenticate_user_local(username, password):
    try:
        if not os.path.exists(DB_FILE):
            return False
        with open(DB_FILE, 'r') as f:
            users = json.load(f)
            
        if username in users:
            return verify_password(users[username]["password"], password)
        return False
    except Exception:
        return False

def save_user(username, password, email, name):
    try:
        db = get_db_connection()
        if db is None:
            # Fallback to local JSON
            print("MongoDB not available, using local users.json")
            return save_user_local(username, password, email, name)
            
        users_collection = db["users"]
        if users_collection.find_one({"username": username}): return False
        hashed = hash_password(password)
        user_doc = {"username": username, "password": hashed, "email": email, "name": name}
        users_collection.insert_one(user_doc)
        return True
    except Exception as e:
        print(f"Database error: {e}")
        # Fallback on error too? Maybe safer not to mix modes unexpectedly, but for this user likely wanted.
        return save_user_local(username, password, email, name)

def authenticate_user(username, password):
    try:
        db = get_db_connection()
        if db is None:
             print("MongoDB not available, using local users.json")
             return authenticate_user_local(username, password)
             
        users_collection = db["users"]
        user = users_collection.find_one({"username": username})
        if user: return verify_password(user["password"], password)
        return False
    except Exception as e:
        print(f"Database error: {e}")
        return authenticate_user_local(username, password)

# HISTORY MANAGEMENT
#---------------------------------------------------------------------------
HISTORY_FILE = "history.json"

def save_history_local(username, history_item):
    try:
        history = {}
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        
        if username not in history:
            history[username] = []
        
        history[username].insert(0, history_item) # Prepend
        
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f)
        return True
    except Exception as e:
        print(f"Local History Error: {e}")
        return False

def get_history_local(username):
    try:
        if not os.path.exists(HISTORY_FILE):
            return []
        with open(HISTORY_FILE, 'r') as f:
            history = json.load(f)
        return history.get(username, [])
    except Exception:
        return []

def save_history(username, car_model, stats, status="Completed"):
    import datetime
    item = {
        "timestamp": datetime.datetime.now().isoformat(),
        "car_model": car_model,
        "stats": stats,
        "status": status
    }
    
    try:
        db = get_db_connection()
        if db is None:
            return save_history_local(username, item)
            
        history_collection = db["history"]
        history_collection.insert_one({
            "username": username,
            **item
        })
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return save_history_local(username, item)

def get_history(username):
    try:
        db = get_db_connection()
        if db is None:
            return get_history_local(username)
            
        history_collection = db["history"]
        cursor = history_collection.find({"username": username}).sort("timestamp", -1)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return results
    except Exception as e:
        print(f"Database error: {e}")
        return get_history_local(username)

