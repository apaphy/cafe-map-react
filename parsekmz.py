import zipfile
import io
import json
import xmltodict
import re
from xml.dom import minidom

def format_xml(xml_string: str) -> str:
    parsed = minidom.parseString(xml_string)
    return parsed.toprettyxml(indent=" ")

kmz_path = 'socal.kmz'
kml_data = None

# Open the KMZ file and extract the KML data
with zipfile.ZipFile(kmz_path, 'r') as kmz_file:
    # Read the main KML file, typically named 'doc.kml'
    try:
        kml_data = kmz_file.read('doc.kml')
    except KeyError:
        print("doc.kml not found in the archive")
        # Handle cases where the main file has a different name
        # (e.g., iterate through kmz_file.namelist() to find the KML file)

rating_dict = {"#icon-1534-0F9D58": "good", "#icon-1534-FFEA00": "ok", "#icon-1534-FF5252": "bad"}

if kml_data:
    # KML data is now available as bytes in the kml_data variable
    # Proceed to parsing with a KML library
    data_dict = xmltodict.parse(format_xml(kml_data))
    output_filename = kmz_path + '.json'

    # parse the dict a bit
    placemarks = data_dict["kml"]["Document"]["Placemark"]
    for i in range(len(placemarks)):
        placemark = placemarks[i]
        description = str(placemark["description"])
        description = description.replace('<br>', '\n')
        
        # Extract all image src links
        img_src_pattern = r'<img\s+[^>]*src\s*=\s*["\']([^"\']+)["\']'
        image_links = re.findall(img_src_pattern, description)
        
        # Remove all <img> tags from description
        description = re.sub(r'<img\s+[^>]*>', '', description)
        
        # Extract ratings (e.g., "cleanliness: 9/10")
        ratings = {}
        rating_pattern = r'([^:]+):\s*(\d+/\d+)'
        rating_matches = re.findall(rating_pattern, description)
        for rating_type, rating_value in rating_matches:
            ratings[rating_type.strip()] = rating_value
        
        # Remove rating lines from description
        description = re.sub(r'^\s*[^:]+:\s*\d+/\d+\s*$', '', description, flags=re.MULTILINE)
        # Clean up extra blank lines
        description = re.sub(r'\n\s*\n', '\n', description).strip()
        
        # Add images array to placemark
        placemark["images"] = image_links
        placemark["ratings"] = ratings
        placemark["description"] = description
        coords = placemark["Point"]["coordinates"].split(',')
        placemark["latitude"] = float(coords[1])
        placemark["longitude"] = float(coords[0])
        placemark["rating"] = rating_dict[placemark["styleUrl"]]
        try:
            del placemark["Point"]
            del placemark["ExtendedData"]
            del placemark["styleUrl"]
        except:
            pass
        
        # "<img src=\"https://mymaps.usercontent.google.com/hostedimage/m/*/3ALCsBorU4-rzPvhTXgpqSKH5FrlcCP8ogidEaDmQlmulTbDpgfc3qTzWNvlmcH6imGaDZf-N3soHP-WpuE65KJ4lhwCTdgQDQKvWW32JEX4i-dW0sgVTI5fQn38nPGoQDlRiulL0PwWpl3G3cfgpEE3dJpwd_QuFAr7mUUfN7JmrAvi_rbawdq4AlR_az_PQoToGmMx6wDTvyCMhQoVbzkrJKUzRmoXS000okqpb7o0_Ohs7x8IEpa9pgErgxw8?authuser=0&fife=s16383\" height=\"200\" width=\"auto\" /><br><br>drink quality: 8/10<br>cleanliness: 10/10<br>quietness: 9/10<br>crowdedness: 8/10<br>drink gotten: iced hojicha latte<br><br>goated teahouse first ktown W so far. place was clean, there was a surprisingly good amount of seating and outlets and working wifi?? drink was really good but it was like 60% ice i totally got scammed. for $7 it was not enough drink but the menu looked really good def worth another visit.<br><br><img src=\"https://mymaps.usercontent.google.com/hostedimage/m/*/3ALCsBorObXYis_qejxtkd2Emj3r1pWV0aKCiLQrBaPKxHEfLAEDO4qhl0Je7G_OkNUvtwDCcAYUo0A8K3jYlXts1f505xyiR-SlgfhP6X7XLnSIJ1AG2SaQa6a1GMriEpvtakkXU9FAZjKLnQSZJBp_hYhs-U2ksOFetLZpttHvE-pkk7c-xYTi0dx5qKFhLz7Z5vh5ir-i3wZNRGmfRDCdgNDPldXOULTqBSzPd-GuIP7iAW_xI7jICZ1aZOww?authuser=0&fife=s16383\" height=\"200\" width=\"auto\" />",
        # print(placemark)

    with open(output_filename, 'w') as json_file:
        json.dump(placemarks, json_file, indent=4)