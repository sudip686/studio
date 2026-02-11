import sys

def check_utf8(filename):
    with open(filename, 'rb') as f:
        data = f.read()
    try:
        decoded = data.decode('utf-8')
        print("File is valid UTF-8")
    except UnicodeDecodeError as e:
        print(f"Invalid UTF-8 at byte {e.start}: {e.reason}")
        # Print some context
        start = max(0, e.start - 10)
        end = min(len(data), e.start + 10)
        print(f"Context: {data[start:end].hex()}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_utf8.py <filename>")
        sys.exit(1)
    check_utf8(sys.argv[1])