from flask import (
    Flask, render_template, request, jsonify, session, redirect, url_for, flash
)
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
import psycopg2.extras # For dictionary cursors
import json
import os
from datetime import datetime, date
import logging
from collections import defaultdict
from functools import wraps

app = Flask(__name__)

# !!! IMPORTANT: Set a strong, random secret key for session security !!!
app.secret_key = os.environ.get('FLASK_SECRET_KEY', b'_5#y2L"F4Q8z\n\xec]/' ) # Replace or use env var

# --- Database Configuration ---
DB_NAME = os.environ.get('DB_NAME', "coffee_tracker_db")
DB_USER = os.environ.get('DB_USER', "postgres") # Replace
DB_PASSWORD = os.environ.get('DB_PASSWORD', "postgres") # Replace
DB_HOST = os.environ.get('DB_HOST', "localhost")
DB_PORT = os.environ.get('DB_PORT', "5432")

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.Error as e:
        logging.error(f"Error connecting to PostgreSQL database: {e}")
        raise

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# --- Coffee Definitions (Static) ---
COFFEE_COSTS = {
    "Chiaro": 0.55, "Cosi": 0.49, "Buenos Aires": 0.54, "Vienna": 0.54,
    "Roma": 0.50, "Arpeggio": 0.50, "Livanto": 0.50, "Volluto Decaf": 0.52
}
COFFEE_VOLUMES = { # in ml
    "Chiaro": 40, "Cosi": 40, "Buenos Aires": 90, "Vienna": 90,
    "Roma": 40, "Arpeggio": 40, "Livanto": 40, "Volluto Decaf": 90
}

# --- Authentication Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# --- Authentication Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handles user login."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
            user_record = cur.fetchone()
            cur.close()

            if user_record and check_password_hash(user_record['password_hash'], password):
                session['user_id'] = user_record['id']
                session['logged_in_user'] = user_record['username']
                flash(f'Welcome back, {user_record["username"]}!', 'success')
                next_url = request.args.get('next')
                logging.info(f"User '{user_record['username']}' logged in successfully.")
                return redirect(next_url or url_for('coffee_tracker_page'))
            else:
                flash('Invalid username or password.', 'danger')
        except psycopg2.Error as e:
            logging.error(f"Database error during login: {e}")
            flash('A database error occurred. Please try again later.', 'danger')
        except Exception as e:
            logging.error(f"Unexpected error during login: {e}")
            flash('An unexpected error occurred. Please try again.', 'danger')
        finally:
            if conn: conn.close()
    return render_template('login.html') # Ensure you have a login.html template

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Handles new user registration."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not username or not password or not confirm_password:
            flash('All fields are required.', 'danger')
            return render_template('register.html') # Ensure you have a register.html
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')
        if len(password) < 6: 
            flash('Password must be at least 6 characters long.', 'danger')
            return render_template('register.html')

        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            
            cur.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cur.fetchone():
                flash('Username already exists. Please choose a different one.', 'warning')
                cur.close()
                return render_template('register.html')
            
            password_hash = generate_password_hash(password)
            
            cur.execute(
                "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
                (username, password_hash)
            )
            conn.commit()
            cur.close()
            
            flash('Registration successful! Please log in.', 'success')
            logging.info(f"New user registered: {username}")
            return redirect(url_for('login'))
            
        except psycopg2.Error as e:
            if conn: conn.rollback()
            logging.error(f"Database error during registration: {e}")
            flash('A database error occurred. Please try again later.', 'danger')
        except Exception as e:
            logging.error(f"Unexpected error during registration: {e}")
            flash('An unexpected error occurred. Please try again.', 'danger')
        finally:
            if conn: conn.close()
            
    return render_template('register.html') # Ensure you have a register.html template


@app.route('/logout')
def logout():
    """Logs the user out."""
    session.pop('user_id', None)
    session.pop('logged_in_user', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# --- Main Application Routes (Protected) ---
@app.route("/")
@login_required
def index():
    # Redirect to coffee_tracker_page or a dashboard if you have one
    return redirect(url_for('coffee_tracker_page'))

@app.route("/coffee")
@login_required
def coffee_tracker_page():
    # Pass the username to the template
    return render_template("coffee_tracker.html", username=session.get('logged_in_user'))

# --- API Routes (Protected) ---
@app.route("/api/coffee-types", methods=['GET'])
@login_required 
def get_coffee_types():
    """Returns a list of available coffee types with their costs and volumes."""
    types_list = [{"name": name, "cost": cost, "volume": COFFEE_VOLUMES.get(name, 0)}
                  for name, cost in COFFEE_COSTS.items()]
    return jsonify(types_list)

@app.route("/api/coffees/<date_string>", methods=['GET'])
@login_required 
def get_coffees_for_date(date_string):
    """Gets all coffee entries for a specific user and date."""
    try:
        entry_date = datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    user_id = session.get('user_id')
    coffees_for_date = []
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT id, coffee_type, entry_time, cost FROM coffee_entries "
            "WHERE user_id = %s AND entry_date = %s ORDER BY entry_time",
            (user_id, entry_date)
        )
        rows = cur.fetchall()
        cur.close()
        for row in rows:
            coffees_for_date.append({
                "id": row["id"], 
                "type": row["coffee_type"],
                # Format time to HH:MM AM/PM, removing leading zero from hour
                "time": row["entry_time"].strftime('%I:%M %p').lstrip('0'), 
                "cost": float(row["cost"]) # Ensure cost is float
            })
    except psycopg2.Error as e:
        logging.error(f"DB error fetching coffees for date {date_string} for user {user_id}: {e}")
        return jsonify({"error": "Database error while fetching coffee entries"}), 500
    finally:
        if conn: conn.close()
    return jsonify(coffees_for_date)

@app.route("/api/coffees/<date_string>", methods=['POST'])
@login_required 
def add_coffee_for_date(date_string):
    """Adds a new coffee entry for the logged-in user for a specific date."""
    try:
        entry_date = datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    user_id = session.get('user_id')
    data = request.get_json()

    if not data or 'type' not in data or 'time' not in data:
        return jsonify({"error": "Missing 'type' or 'time' in request."}), 400

    coffee_type = data['type']
    entry_time_str = data['time'] # Expecting time like "09:30 AM"
    
    if coffee_type not in COFFEE_COSTS:
        return jsonify({"error": f"Unknown coffee type: {coffee_type}"}), 400
    
    cost = COFFEE_COSTS[coffee_type]

    try:
        # Parse time string (e.g., "09:30 AM") into a time object
        entry_time_obj = datetime.strptime(entry_time_str, '%I:%M %p').time()
    except ValueError:
        return jsonify({"error": "Invalid time format. Use HH:MM AM/PM."}), 400

    conn = None
    new_entry_id = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO coffee_entries (user_id, coffee_type, entry_date, entry_time, cost) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (user_id, coffee_type, entry_date, entry_time_obj, cost)
        )
        new_entry_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        logging.info(f"User {user_id} added coffee: {coffee_type} on {date_string} at {entry_time_str}, cost {cost}, ID: {new_entry_id}")
        return jsonify({"id": new_entry_id, "type": coffee_type, "time": entry_time_str, "cost": cost}), 201
    except psycopg2.Error as e:
        if conn: conn.rollback()
        logging.error(f"DB error adding coffee for user {user_id}: {e}")
        return jsonify({"error": "Database error while adding coffee"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/coffees/<date_string>", methods=['DELETE'])
@login_required 
def clear_coffees_for_date(date_string):
    """Clears all coffee entries for the logged-in user for a specific date."""
    try:
        entry_date = datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    
    user_id = session.get('user_id')
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM coffee_entries WHERE user_id = %s AND entry_date = %s",
            (user_id, entry_date)
        )
        conn.commit()
        rows_deleted = cur.rowcount
        cur.close()
        logging.info(f"User {user_id} cleared {rows_deleted} coffees for date {date_string}.")
        return jsonify({"message": f"Coffees for {date_string} cleared successfully.", "deleted_count": rows_deleted}), 200
    except psycopg2.Error as e:
        if conn: conn.rollback()
        logging.error(f"DB error clearing coffees for user {user_id}: {e}")
        return jsonify({"error": "Database error while clearing coffees"}), 500
    finally:
        if conn: conn.close()

# --- NEW ENDPOINT FOR DELETING A SINGLE COFFEE ENTRY ---
@app.route("/api/coffee_entry/<int:entry_id>", methods=['DELETE'])
@login_required
def delete_coffee_entry(entry_id):
    """Deletes a specific coffee entry by its ID for the logged-in user."""
    user_id = session.get('user_id')
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Ensure the entry belongs to the current user before deleting
        cur.execute(
            "DELETE FROM coffee_entries WHERE id = %s AND user_id = %s",
            (entry_id, user_id)
        )
        conn.commit()
        rows_deleted = cur.rowcount
        cur.close()

        if rows_deleted == 0:
            # Either entry didn't exist or didn't belong to the user
            logging.warning(f"User {user_id} attempt to delete non-existent or unauthorized entry ID {entry_id}.")
            return jsonify({"error": "Entry not found or not authorized to delete."}), 404
        
        logging.info(f"User {user_id} deleted coffee entry ID {entry_id}.")
        return jsonify({"message": f"Coffee entry {entry_id} deleted successfully.", "deleted_id": entry_id}), 200
    except psycopg2.Error as e:
        if conn: conn.rollback()
        logging.error(f"DB error deleting coffee entry ID {entry_id} for user {user_id}: {e}")
        return jsonify({"error": "Database error while deleting coffee entry"}), 500
    finally:
        if conn: conn.close()

# --- Report Routes ---
@app.route("/api/reports/monthly", methods=['GET'])
@login_required 
def get_monthly_report():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
        month = int(request.args.get('month'))
    except (TypeError, ValueError): return jsonify({"error": "Year/month required as integers."}), 400
    if not (1 <= month <= 12 and 2000 <= year <= date.today().year + 5): # Allow a few future years
        return jsonify({"error": "Invalid year or month."}), 400
    
    type_filter = request.args.get('type', 'All')
    if type_filter != 'All' and type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type: {type_filter}"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        sql_query = """
            SELECT coffee_type, COUNT(*) as count, SUM(cost) as total_cost
            FROM coffee_entries
            WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s AND EXTRACT(MONTH FROM entry_date) = %s
        """
        params = [user_id, year, month]

        if type_filter != 'All':
            sql_query += " AND coffee_type = %s"
            params.append(type_filter)
        
        sql_query += " GROUP BY coffee_type ORDER BY coffee_type;"
        cur.execute(sql_query, tuple(params))
        rows = cur.fetchall()
        
        overall_total_coffees = 0
        overall_total_cost = 0.0
        breakdown = {}

        if type_filter == 'All':
            for row in rows:
                breakdown[row['coffee_type']] = {"count": row['count'], "cost": float(row['total_cost'])}
                overall_total_coffees += row['count']
                overall_total_cost += float(row['total_cost'])
        elif rows: # Specific type filter and data found
            row = rows[0] # Should only be one row if filtered by type and grouped by type
            overall_total_coffees = row['count']
            overall_total_cost = float(row['total_cost'])
            # No breakdown needed if filtering by a specific type, totals are for that type
        
        cur.close()
        report = {
            "year": year, 
            "month": month, 
            "coffee_type_filter": type_filter,
            "total_coffees": overall_total_coffees, 
            "total_cost": round(overall_total_cost, 2),
            "breakdown_by_type": breakdown if type_filter == 'All' else {} # Only show breakdown if 'All' types
        }
        return jsonify(report)
    except psycopg2.Error as e:
        logging.error(f"DB error generating monthly report for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/reports/yearly", methods=['GET'])
@login_required 
def get_yearly_report():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 5): # Allow a few future years
        return jsonify({"error": "Invalid year."}), 400
    
    type_filter = request.args.get('type', 'All')
    if type_filter != 'All' and type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type: {type_filter}"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        sql_query = """
            SELECT coffee_type, COUNT(*) as count, SUM(cost) as total_cost
            FROM coffee_entries
            WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s
        """
        params = [user_id, year]

        if type_filter != 'All':
            sql_query += " AND coffee_type = %s"
            params.append(type_filter)
            
        sql_query += " GROUP BY coffee_type ORDER BY coffee_type;"
        cur.execute(sql_query, tuple(params))
        rows = cur.fetchall()
        
        overall_total_coffees = 0
        overall_total_cost = 0.0
        breakdown = {}

        if type_filter == 'All':
            for row in rows:
                breakdown[row['coffee_type']] = {"count": row['count'], "cost": float(row['total_cost'])}
                overall_total_coffees += row['count']
                overall_total_cost += float(row['total_cost'])
        elif rows: # Specific type filter and data found
            row = rows[0]
            overall_total_coffees = row['count']
            overall_total_cost = float(row['total_cost'])
            # No breakdown needed if filtering by a specific type

        cur.close()
        report = {
            "year": year, 
            "coffee_type_filter": type_filter,
            "total_coffees": overall_total_coffees, 
            "total_cost": round(overall_total_cost, 2),
            "breakdown_by_type": breakdown if type_filter == 'All' else {}
        }
        return jsonify(report)
    except psycopg2.Error as e:
        logging.error(f"DB error generating yearly report for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/fun-facts/yearly-volume", methods=['GET'])
@login_required 
def get_yearly_volume():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 5): # Allow a few future years
        return jsonify({"error": "Invalid year."}), 400
    
    total_volume_ml = 0
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT coffee_type, COUNT(*) as count FROM coffee_entries "
            "WHERE user_id = %s AND EXTRACT(YEAR FROM entry_date) = %s "
            "GROUP BY coffee_type",
            (user_id, year)
        )
        rows = cur.fetchall()
        cur.close()
        for row in rows:
            if row['coffee_type'] in COFFEE_VOLUMES: 
                total_volume_ml += COFFEE_VOLUMES[row['coffee_type']] * row['count']
        return jsonify({"year": year, "total_volume_ml": total_volume_ml})
    except psycopg2.Error as e:
        logging.error(f"DB error getting yearly volume for user {user_id}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()


if __name__ == "__main__":
    # For development, ensure debug is True. For production, set to False.
    # Host '0.0.0.0' makes it accessible externally if needed, otherwise '127.0.0.1' for local only.
    app.run(host='0.0.0.0', port=5000, debug=True)
