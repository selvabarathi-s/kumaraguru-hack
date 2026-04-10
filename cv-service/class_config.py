PRIMARY_CATEGORIES = ["ewaste", "mixed_waste"]

EWASTE_ITEM_CLASSES = [
    "mobile_phone",
    "laptop",
    "circuit_board",
    "battery",
    "cable_wire",
    "monitor_screen",
    "appliance",
    "keyboard",
    "mouse",
    "printer",
    "router",
    "tablet",
]

SECONDARY_MIXED_CLASSES = [
    "glass",
    "medical",
    "plastic",
    "paper",
    "metal",
    "organic",
    "textile",
]

DEFAULT_MODEL_CLASSES = EWASTE_ITEM_CLASSES + SECONDARY_MIXED_CLASSES

CLASS_METADATA = {
    "mobile_phone": {
        "display_name": "Mobile Phone",
        "device_category": "Mobile",
        "estimated_weight_kg": 0.2,
        "handling_instructions": "Remove the battery if possible and send to an authorized mobile e-waste recycler.",
    },
    "laptop": {
        "display_name": "Laptop",
        "device_category": "IT_equipment",
        "estimated_weight_kg": 2.5,
        "handling_instructions": "Separate battery and storage components before refurbishment or recycling.",
    },
    "circuit_board": {
        "display_name": "Circuit Board",
        "device_category": "IT_equipment",
        "estimated_weight_kg": 0.3,
        "handling_instructions": "Store dry and route to a recycler that handles precious-metal recovery.",
    },
    "battery": {
        "display_name": "Battery",
        "device_category": "Batteries",
        "estimated_weight_kg": 0.5,
        "handling_instructions": "Insulate terminals and keep away from heat before hazardous-waste pickup.",
    },
    "cable_wire": {
        "display_name": "Cable / Wire",
        "device_category": "IT_equipment",
        "estimated_weight_kg": 0.4,
        "handling_instructions": "Bundle separately for copper recovery and insulation-safe processing.",
    },
    "monitor_screen": {
        "display_name": "Monitor / Screen",
        "device_category": "IT_equipment",
        "estimated_weight_kg": 5.0,
        "handling_instructions": "Avoid screen breakage and send to facilities that handle display panels safely.",
    },
    "appliance": {
        "display_name": "Appliance",
        "device_category": "Large_appliances",
        "estimated_weight_kg": 10.0,
        "handling_instructions": "Check for refrigerants or motors and process through appliance dismantling streams.",
    },
    "keyboard": {
        "display_name": "Keyboard",
        "device_category": "IT_accessories",
        "estimated_weight_kg": 0.7,
        "handling_instructions": "Collect with mixed peripherals for plastic and metal recovery.",
    },
    "mouse": {
        "display_name": "Mouse",
        "device_category": "IT_accessories",
        "estimated_weight_kg": 0.15,
        "handling_instructions": "Combine with small peripherals and send for shred-and-sort recycling.",
    },
    "printer": {
        "display_name": "Printer",
        "device_category": "Office_equipment",
        "estimated_weight_kg": 8.0,
        "handling_instructions": "Remove ink or toner cartridges before sending to an office-equipment recycler.",
    },
    "router": {
        "display_name": "Router",
        "device_category": "Networking_equipment",
        "estimated_weight_kg": 0.4,
        "handling_instructions": "Recycle with small electronics and separate power adapters where possible.",
    },
    "tablet": {
        "display_name": "Tablet",
        "device_category": "Mobile",
        "estimated_weight_kg": 0.5,
        "handling_instructions": "Treat like a small screen device and isolate damaged batteries.",
    },
    "glass": {
        "display_name": "Glass",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Keep separate from electronics and send to a glass recycling stream where available.",
    },
    "medical": {
        "display_name": "Medical Waste",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Do not mix with e-waste. Route through approved biomedical or hazardous waste handling.",
    },
    "plastic": {
        "display_name": "Plastic",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Sort by resin type if possible and send through the plastic recycling stream.",
    },
    "paper": {
        "display_name": "Paper",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Keep dry and route through standard paper recycling.",
    },
    "metal": {
        "display_name": "Metal",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Collect separately as scrap metal and avoid mixing with hazardous items.",
    },
    "organic": {
        "display_name": "Organic Waste",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Keep out of the electronics stream and divert to compost or wet waste processing.",
    },
    "textile": {
        "display_name": "Textile",
        "device_category": None,
        "estimated_weight_kg": 0.0,
        "handling_instructions": "Separate for reuse or textile recycling instead of e-waste handling.",
    },
}


def is_ewaste_class(class_name):
    return class_name in EWASTE_ITEM_CLASSES


def get_primary_category(class_name):
    return "ewaste" if is_ewaste_class(class_name) else "mixed_waste"


def get_class_metadata(class_name):
    return CLASS_METADATA.get(
        class_name,
        {
            "display_name": class_name.replace("_", " ").title(),
            "device_category": "General_electronics" if is_ewaste_class(class_name) else None,
            "estimated_weight_kg": 1.0 if is_ewaste_class(class_name) else 0.0,
            "handling_instructions": "Route to the correct authorized waste stream after manual verification.",
        },
    )
