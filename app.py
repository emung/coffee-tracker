from flask import (
    Flask, render_template, request, jsonify, session, redirect, url_for, flash
)
from werkzeug.security import check_password_hash, generate_password_hash
import psycopg2
import psycopg2.extras # For dictionary cursors
import json # Still needed for COFFEE_COSTS/VOLUMES if not moved to DB
import os
from datetime import datetime, date
import logging
from collections import defaultdict
from functools import wraps

app = Flask(__name__)

# !!! IMPORTANT: Set a strong, random secret key for session security !!!
# You can generate one using: python -c 'import os; print(os.urandom(24))'
# Store this securely, perhaps as an environment variable in production.
app.secret_key = os.environ.get('FLASK_SECRET_KEY', b'_5#y2L"F4Q8z\n\xec]/' ) # Replace with your actual secret key or use env var

# --- Database Configuration ---
# !!! IMPORTANT: Replace with your actual PostgreSQL connection details !!!
# Consider using environment variables for these in a production setting.
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
        # In a real app, you might want to handle this more gracefully
        # or ensure the app doesn't start if DB connection fails.
        raise  # Re-raise the exception to see it during development

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# --- Coffee Definitions (Static, could be moved to DB later for more flexibility) ---
COFFEE_COSTS = {
    "Chiaro": 0.55, "Cosi": 0.49, "Buenos Aires": 0.54, "Vienna": 0.54,
    "Roma": 0.50, "Arpeggio": 0.50, "Livanto": 0.50, "Volluto Decaf": 0.52
}
COFFEE_VOLUMES = { # in ml
    "Chiaro": 50, "Cosi": 50, "Buenos Aires": 110, "Vienna": 110,
    "Roma": 50, "Arpeggio": 50, "Livanto": 50, "Volluto Decaf": 110
}

# --- Authentication Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session: # Check for user_id now
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
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor) # Use DictCursor
            cur.execute("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
            user_record = cur.fetchone()
            cur.close()

            if user_record and check_password_hash(user_record['password_hash'], password):
                session['user_id'] = user_record['id'] # Store user_id
                session['logged_in_user'] = user_record['username']
                flash(f'Welcome back, {user_record["username"]}!', 'success')
                next_url = request.args.get('next')
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
            if conn:
                conn.close()
    return render_template('login.html')

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
    return redirect(url_for('coffee_tracker_page'))

@app.route("/coffee")
@login_required
def coffee_tracker_page():
    """Serves the main coffee tracker HTML page."""
    return render_template("coffee_tracker.html", username=session.get('logged_in_user'))

# --- API Routes (Protected) ---

@app.route("/api/coffee-types", methods=['GET'])
@login_required
def get_coffee_types():
    """API endpoint to get available coffee types and their costs/volumes."""
    # This still uses the static definitions. Could be moved to DB.
    types_list = [{"name": name, "cost": cost, "volume": COFFEE_VOLUMES.get(name, 0)}
                  for name, cost in COFFEE_COSTS.items()]
    return jsonify(types_list)

@app.route("/api/coffees/<date_string>", methods=['GET'])
@login_required
def get_coffees_for_date(date_string):
    """API endpoint to get coffee entries for a specific date for the logged-in user."""
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
                "id": row["id"], # Good to have if you want to implement edit/delete single entry later
                "type": row["coffee_type"],
                "time": row["entry_time"].strftime('%I:%M %p').lstrip('0'), # Format time
                "cost": float(row["cost"]) # Ensure cost is float
            })
    except psycopg2.Error as e:
        logging.error(f"DB error fetching coffees for date {date_string}: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn:
            conn.close()
    return jsonify(coffees_for_date)

@app.route("/api/coffees/<date_string>", methods=['POST'])
@login_required
def add_coffee_for_date(date_string):
    """API endpoint to add a new coffee entry for a specific date for the logged-in user."""
    try:
        entry_date = datetime.strptime(date_string, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    user_id = session.get('user_id')
    data = request.get_json()

    if not data or 'type' not in data or 'time' not in data:
        return jsonify({"error": "Missing 'type' or 'time' in request."}), 400
    
    coffee_type = data['type']
    entry_time_str = data['time'] # Assuming time is like "09:30 AM"

    if coffee_type not in COFFEE_COSTS:
        return jsonify({"error": f"Unknown coffee type: {coffee_type}"}), 400
    
    cost = COFFEE_COSTS[coffee_type]

    try:
        # Convert "09:30 AM/PM" to datetime.time object
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
        logging.info(f"User {user_id} added coffee: {coffee_type} on {date_string} at {entry_time_str}, cost {cost}")
        return jsonify({"id": new_entry_id, "type": coffee_type, "time": entry_time_str, "cost": cost}), 201
    except psycopg2.Error as e:
        if conn: conn.rollback()
        logging.error(f"DB error adding coffee: {e}")
        return jsonify({"error": "Database error while adding coffee"}), 500
    finally:
        if conn:
            conn.close()

@app.route("/api/coffees/<date_string>", methods=['DELETE'])
@login_required
def clear_coffees_for_date(date_string):
    """API endpoint to clear all coffee entries for a specific date for the logged-in user."""
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
        logging.error(f"DB error clearing coffees: {e}")
        return jsonify({"error": "Database error while clearing coffees"}), 500
    finally:
        if conn:
            conn.close()

@app.route("/api/reports/monthly", methods=['GET'])
@login_required
def get_monthly_report():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
        month = int(request.args.get('month'))
    except (TypeError, ValueError): return jsonify({"error": "Year/month required as integers."}), 400
    if not (1 <= month <= 12 and 2000 <= year <= date.today().year + 5):
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

        # For "All" filter, we need overall totals and breakdown
        # For specific filter, rows will contain data for that type only, or be empty
        
        overall_total_coffees = 0
        overall_total_cost = 0.0
        breakdown = {}

        if type_filter == 'All':
            for row in rows:
                breakdown[row['coffee_type']] = {"count": row['count'], "cost": float(row['total_cost'])}
                overall_total_coffees += row['count']
                overall_total_cost += float(row['total_cost'])
        else: # Specific type filter
            if rows: # Should be at most one row if a specific type was found
                row = rows[0]
                overall_total_coffees = row['count']
                overall_total_cost = float(row['total_cost'])
            # breakdown will remain empty as we only care about the filtered type's totals

        cur.close()
        report = {
            "year": year, "month": month, "coffee_type_filter": type_filter,
            "total_coffees": overall_total_coffees, "total_cost": round(overall_total_cost, 2),
            "breakdown_by_type": breakdown if type_filter == 'All' else {} # Only provide breakdown for 'All'
        }
        return jsonify(report)

    except psycopg2.Error as e:
        logging.error(f"DB error generating monthly report: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()


@app.route("/api/reports/yearly", methods=['GET'])
@login_required
def get_yearly_report():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError): return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 5): return jsonify({"error": "Invalid year."}), 400
    
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
        else: # Specific type filter
            if rows:
                row = rows[0]
                overall_total_coffees = row['count']
                overall_total_cost = float(row['total_cost'])
        
        cur.close()
        report = {
            "year": year, "coffee_type_filter": type_filter,
            "total_coffees": overall_total_coffees, "total_cost": round(overall_total_cost, 2),
            "breakdown_by_type": breakdown if type_filter == 'All' else {}
        }
        return jsonify(report)

    except psycopg2.Error as e:
        logging.error(f"DB error generating yearly report: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/fun-facts/yearly-volume", methods=['GET'])
@login_required
def get_yearly_volume():
    user_id = session.get('user_id')
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError): return jsonify({"error": "Year required as integer."}), 400
    if not (2000 <= year <= date.today().year + 5): return jsonify({"error": "Invalid year."}), 400

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
        logging.error(f"DB error getting yearly volume: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    # For development, ensure debug is True.
    # For production, use a proper WSGI server like Gunicorn or uWSGI.
    app.run(host='0.0.0.0', port=5000, debug=True)
