import os
import json

# Define compatible fields for version 1.12.12
compatible_fields = {
    "char_name",
    "char_persona",
    "world_scenario",
    "char_greeting",
    "example_dialogue",
    "description"
}

def convert_character_card(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as infile:
        data = json.load(infile)

    filtered_data = {key: value for key, value in data.items() if key in compatible_fields}

    with open(output_path, 'w', encoding='utf-8') as outfile:
        json.dump(filtered_data, outfile, ensure_ascii=False, indent=4)

def process_directory():
    source_dir = input("Enter the path to the source directory containing character cards: ").strip()

    if not os.path.exists(source_dir):
        print("The provided directory does not exist.")
        return

    output_dir = os.path.join(source_dir, 'converted_cards')
    os.makedirs(output_dir, exist_ok=True)

    for filename in os.listdir(source_dir):
        if filename.endswith('.json'):
            input_path = os.path.join(source_dir, filename)
            output_path = os.path.join(output_dir, filename)
            convert_character_card(input_path, output_path)
            print(f"Converted: {filename}")

    print(f"Conversion complete. Converted files are in '{output_dir}'")

# Run the script
if __name__ == "__main__":
    process_directory()
