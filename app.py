from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime, date
import logging
from collections import defaultdict

app = Flask(__name__)

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# --- Coffee Definitions ---
COFFEE_COSTS = {
    "Chiaro": 0.55,
    "Cosi": 0.49,
    "Buenos Aires": 0.54,
    "Vienna": 0.54,
    "Roma": 0.50,
    "Arpeggio": 0.50,
    "Livanto": 0.50,
    "Volluto Decaf": 0.52
}

COFFEE_VOLUMES = { # in ml
    "Chiaro": 50,
    "Cosi": 50,
    "Buenos Aires": 110,
    "Vienna": 110,
    "Roma": 50,
    "Arpeggio": 50,
    "Livanto": 50,
    "Volluto Decaf": 110
}


# Define the path for the data file
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'coffee_log.json')

# Ensure the data directory exists
if not os.path.exists(DATA_DIR):
    try:
        os.makedirs(DATA_DIR)
        logging.info(f"Created data directory: {DATA_DIR}")
    except OSError as e:
        logging.error(f"Error creating data directory {DATA_DIR}: {e}")

# --- Helper Functions for Data Handling ---
def load_all_data():
    """Loads all coffee data from the JSON file."""
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, 'r') as f:
            content = f.read()
            if not content:
                return {}
            data = json.loads(content)
            return data
    except json.JSONDecodeError as e:
        logging.error(f"Error decoding JSON from {DATA_FILE}: {e}. Returning empty data.")
        return {}
    except Exception as e:
        logging.error(f"An unexpected error occurred while loading data from {DATA_FILE}: {e}. Returning empty data.")
        return {}

def save_all_data(data):
    """Saves all coffee data to the JSON file."""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
        logging.info(f"Successfully saved data to {DATA_FILE}")
    except IOError as e:
        logging.error(f"IOError saving data to {DATA_FILE}: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred while saving data to {DATA_FILE}: {e}")

# --- HTML Page Route ---
@app.route("/coffee")
def coffee_tracker_page():
    """Serves the main coffee tracker HTML page."""
    return render_template("coffee_tracker.html")

# --- API Routes ---

@app.route("/api/coffee-types", methods=['GET'])
def get_coffee_types():
    """API endpoint to get available coffee types and their costs (and volumes)."""
    types_list = []
    for name, cost in COFFEE_COSTS.items():
        types_list.append({
            "name": name,
            "cost": cost,
            "volume": COFFEE_VOLUMES.get(name, 0) # Get volume, default to 0 if not defined
        })
    return jsonify(types_list)

@app.route("/api/coffees/<date_string>", methods=['GET'])
def get_coffees_for_date(date_string):
    """API endpoint to get coffee entries for a specific date."""
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
        
    all_data = load_all_data()
    coffees_for_date = all_data.get(date_string, [])
    return jsonify(coffees_for_date)

@app.route("/api/coffees/<date_string>", methods=['POST'])
def add_coffee_for_date(date_string):
    """API endpoint to add a new coffee entry for a specific date."""
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        new_coffee_entry_data = request.get_json()
        if not new_coffee_entry_data or \
           'type' not in new_coffee_entry_data or \
           'time' not in new_coffee_entry_data or \
           new_coffee_entry_data['type'] not in COFFEE_COSTS: # Check against costs, implies type is known
            logging.warning(f"POST /api/coffees/{date_string} - Invalid coffee data or unknown type: {new_coffee_entry_data}")
            return jsonify({"error": "Invalid coffee data: 'type' (must be known) and 'time' are required."}), 400
        
        coffee_to_store = {
            "type": new_coffee_entry_data['type'],
            "time": new_coffee_entry_data['time']
        }
    except Exception as e:
        logging.error(f"POST /api/coffees/{date_string} - Error parsing JSON payload: {e}")
        return jsonify({"error": f"Invalid JSON payload: {str(e)}"}), 400

    all_data = load_all_data()
    if date_string not in all_data:
        all_data[date_string] = []
    
    all_data[date_string].append(coffee_to_store)
    save_all_data(all_data)
    logging.info(f"POST /api/coffees/{date_string} - Added entry: {coffee_to_store}.")
    return jsonify(coffee_to_store), 201

@app.route("/api/coffees/<date_string>", methods=['DELETE'])
def clear_coffees_for_date(date_string):
    """API endpoint to clear all coffee entries for a specific date."""
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    all_data = load_all_data()
    if date_string in all_data and all_data[date_string]:
        all_data[date_string] = []
        save_all_data(all_data)
        logging.info(f"DELETE /api/coffees/{date_string} - Cleared entries.")
        return jsonify({"message": f"Coffees for {date_string} cleared successfully."}), 200
    logging.info(f"DELETE /api/coffees/{date_string} - No entries found to clear.")
    return jsonify({"message": f"No coffees found for {date_string} to clear."}), 200

@app.route("/api/reports/monthly", methods=['GET'])
def get_monthly_report():
    """ API endpoint for monthly reports. """
    try:
        year = int(request.args.get('year'))
        month = int(request.args.get('month'))
    except (TypeError, ValueError):
        return jsonify({"error": "Year and month must be provided as integers."}), 400

    if not (1 <= month <= 12):
        return jsonify({"error": "Month must be between 1 and 12."}), 400
    if not (2000 <= year <= date.today().year + 5): # Basic year validation
         return jsonify({"error": f"Year seems out of reasonable range."}), 400

    coffee_type_filter = request.args.get('type', 'All') 

    if coffee_type_filter != 'All' and coffee_type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type filter: {coffee_type_filter}"}), 400

    all_data = load_all_data()
    total_coffees_in_month = 0
    total_cost_in_month = 0.0
    coffees_by_type_details = defaultdict(lambda: {"count": 0, "cost": 0.0})

    for date_str, entries in all_data.items():
        try:
            entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            continue 

        if entry_date.year == year and entry_date.month == month:
            for coffee_entry in entries:
                current_coffee_type = coffee_entry.get('type')
                if current_coffee_type in COFFEE_COSTS: 
                    cost_of_this_coffee = COFFEE_COSTS[current_coffee_type]
                    
                    coffees_by_type_details[current_coffee_type]["count"] += 1
                    coffees_by_type_details[current_coffee_type]["cost"] += cost_of_this_coffee
                    
                    if coffee_type_filter == 'All' or current_coffee_type == coffee_type_filter:
                        total_coffees_in_month += 1
                        total_cost_in_month += cost_of_this_coffee
    
    total_cost_in_month = round(total_cost_in_month, 2)
    for type_name in coffees_by_type_details:
        coffees_by_type_details[type_name]["cost"] = round(coffees_by_type_details[type_name]["cost"], 2)

    report = {
        "year": year,
        "month": month,
        "coffee_type_filter": coffee_type_filter,
        "total_coffees": total_coffees_in_month,
        "total_cost": total_cost_in_month,
        "breakdown_by_type": dict(coffees_by_type_details) if coffees_by_type_details else {}
    }
    logging.info(f"GET /api/reports/monthly - Report: {report}")
    return jsonify(report)

@app.route("/api/reports/yearly", methods=['GET'])
def get_yearly_report():
    """ API endpoint for yearly reports. """
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({"error": "Year must be provided as an integer."}), 400

    if not (2000 <= year <= date.today().year + 5):
         return jsonify({"error": f"Year seems out of reasonable range."}), 400

    coffee_type_filter = request.args.get('type', 'All')

    if coffee_type_filter != 'All' and coffee_type_filter not in COFFEE_COSTS:
        return jsonify({"error": f"Invalid coffee type filter: {coffee_type_filter}"}), 400

    all_data = load_all_data()
    total_coffees_in_year = 0
    total_cost_in_year = 0.0
    coffees_by_type_details = defaultdict(lambda: {"count": 0, "cost": 0.0})

    for date_str, entries in all_data.items():
        try:
            entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            continue

        if entry_date.year == year:
            for coffee_entry in entries:
                current_coffee_type = coffee_entry.get('type')
                if current_coffee_type in COFFEE_COSTS:
                    cost_of_this_coffee = COFFEE_COSTS[current_coffee_type]

                    coffees_by_type_details[current_coffee_type]["count"] += 1
                    coffees_by_type_details[current_coffee_type]["cost"] += cost_of_this_coffee

                    if coffee_type_filter == 'All' or current_coffee_type == coffee_type_filter:
                        total_coffees_in_year += 1
                        total_cost_in_year += cost_of_this_coffee
    
    total_cost_in_year = round(total_cost_in_year, 2)
    for type_name in coffees_by_type_details:
        coffees_by_type_details[type_name]["cost"] = round(coffees_by_type_details[type_name]["cost"], 2)

    report = {
        "year": year,
        "coffee_type_filter": coffee_type_filter,
        "total_coffees": total_coffees_in_year,
        "total_cost": total_cost_in_year,
        "breakdown_by_type": dict(coffees_by_type_details) if coffees_by_type_details else {}
    }
    logging.info(f"GET /api/reports/yearly - Report: {report}")
    return jsonify(report)

@app.route("/api/fun-facts/yearly-volume", methods=['GET'])
def get_yearly_volume():
    """ API endpoint for yearly total coffee volume. """
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({"error": "Year must be provided as an integer."}), 400
    
    if not (2000 <= year <= date.today().year + 5):
         return jsonify({"error": f"Year seems out of reasonable range."}), 400

    all_data = load_all_data()
    total_volume_ml = 0

    for date_str, entries in all_data.items():
        try:
            entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            continue

        if entry_date.year == year:
            for coffee_entry in entries:
                coffee_type = coffee_entry.get('type')
                if coffee_type in COFFEE_VOLUMES:
                    total_volume_ml += COFFEE_VOLUMES[coffee_type]
    
    logging.info(f"GET /api/fun-facts/yearly-volume - Year: {year}, Total Volume: {total_volume_ml}ml")
    return jsonify({
        "year": year,
        "total_volume_ml": total_volume_ml
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
