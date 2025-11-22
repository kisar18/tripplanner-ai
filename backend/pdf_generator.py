"""PDF generation utilities for trip exports."""
from io import BytesIO
import httpx
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors


async def generate_trip_pdf(trip_data: dict, place_details: list[dict]) -> BytesIO:
    """Generate a PDF document for a trip with place details and images.
    
    Args:
        trip_data: Dictionary containing trip info (id, city, days, description)
        place_details: List of place dictionaries with details and image_url
        
    Returns:
        BytesIO buffer containing the PDF document
    """
    buffer = BytesIO()
    
    # Create descriptive title for PDF metadata
    city = trip_data.get("city", "Trip")
    days = trip_data.get("days", "")
    pdf_title = f"Trip to {city} - {days} days"
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
        title=pdf_title,
        author="TripPlanner AI"
    )
    styles = getSampleStyleSheet()
    story = []

    # Header
    story.append(Paragraph("Trip Planner - Trip Export", styles["Title"]))
    story.append(Spacer(1, 0.4*cm))

    # Basics table
    basics = [
        ["ID", str(trip_data.get("id"))],
        ["City", trip_data.get("city", "")],
        ["Days", str(trip_data.get("days", ""))],
    ]
    t = Table(basics, hAlign='LEFT', colWidths=[3*cm, 10*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
        ("GRID", (0,0), (-1,-1), 0.25, colors.grey),
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3*cm))

    # Description
    story.append(Paragraph("Description", styles["Heading2"]))
    desc = (trip_data.get("description") or "").replace("\n", "<br/>")
    story.append(Paragraph(desc, styles["BodyText"]))
    story.append(Spacer(1, 0.4*cm))

    # Places to visit
    story.append(Paragraph("Places to Visit", styles["Heading2"]))
    
    if place_details:
        await _add_places_with_images(story, place_details, styles)
    else:
        story.append(Paragraph("No places saved for this trip.", styles["Italic"]))

    doc.build(story)
    buffer.seek(0)
    return buffer


async def _add_places_with_images(story: list, place_details: list[dict], styles):
    """Add places with images to the PDF story."""
    # Download all images first
    async with httpx.AsyncClient(timeout=15.0) as img_client:
        for place in place_details:
            img_url = place.get("image_url")
            if img_url:
                try:
                    img_resp = await img_client.get(
                        img_url,
                        headers={
                            "User-Agent": "Mozilla/5.0 (compatible; TripPlannerAI/1.0; +https://github.com/kisar18/tripplanner-ai)",
                            "Accept": "image/*"
                        }
                    )
                    if img_resp.status_code == 200:
                        place["_image_data"] = img_resp.content
                except Exception:
                    pass  # Skip if download fails
    
    # Build story with downloaded images
    for i, place in enumerate(place_details, 1):
        # Place name
        place_name = place.get('name_translated') or place.get('name', 'Unknown')
        story.append(Paragraph(f"<b>{i}. {place_name}</b>", styles["Heading3"]))
        
        # Add image if downloaded
        if "_image_data" in place:
            try:
                img_data = BytesIO(place["_image_data"])
                img = Image(img_data, width=8*cm)
                story.append(img)
                story.append(Spacer(1, 0.2*cm))
            except Exception:
                pass  # Skip if image rendering fails
        
        # Place info
        info_parts = []
        if place.get("kinds"):
            info_parts.append(f"Type: {place['kinds']}")
        if place.get("dist"):
            info_parts.append(f"Distance: {int(place['dist'])}m from center")
        if place.get("has_wikipedia"):
            info_parts.append("Has Wikipedia article")
        if place.get("has_website"):
            info_parts.append("Has website")
        
        if info_parts:
            story.append(Paragraph(" • ".join(info_parts), styles["BodyText"]))
        
        story.append(Spacer(1, 0.4*cm))
