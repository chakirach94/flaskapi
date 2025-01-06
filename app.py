from flask import Flask, request, jsonify, render_template
import cloudinary
import cloudinary.uploader
from gradio_client import Client, handle_file
import requests

app = Flask(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name="dks27rb4h",       # Replace with your Cloudinary cloud name
    api_key="436195686636373",    # Replace with your Cloudinary API key
    api_secret="EIDTHrnhaYPChrJ7kCBDER0TkP8"  # Replace with your Cloudinary API secret
)

# Home route for uploading the image
@app.route("/")
def index():
    return render_template("index.html")

# Upload and predict route
@app.route("/upload", methods=["POST"])
def upload_and_predict():
    try:
        # Check for the uploaded file
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files["file"]

        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(file)
        cloudinary_url = upload_result.get("secure_url")
        if not cloudinary_url:
            return jsonify({"error": "Failed to upload image to Cloudinary"}), 500
        
        # Print the Cloudinary URL
        print(f"Cloudinary URL: {cloudinary_url}")
        
        # Call the Gradio prediction API directly
        client = Client("zaazo/NutriCitrus")
        result = client.predict(
            img=cloudinary_url,  # Pass the image URL to handle_file directly
            api_name="/predict"
        )
        
        print(result)  # Print the result
        
        # Return the results
        return jsonify({
            "cloudinary_url": cloudinary_url,
            "prediction": result
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
