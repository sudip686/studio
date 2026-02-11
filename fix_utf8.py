import sys

def fix_utf8(filename):
    with open(filename, 'rb') as f:
        data = f.read()

    # The invalid byte is at 5597, which is 0x92, replace with UTF-8 for '
    # ' is U+2019: 0xE2 0x80 0x99
    if len(data) > 5597 and data[5597] == 0x92:
        data = data[:5597] + b'\xe2\x80\x99' + data[5598:]
        print("Fixed invalid byte at 5597")
    else:
        print("Byte at 5597 is not 0x92")

    with open(filename, 'wb') as f:
        f.write(data)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_utf8.py <filename>")
        sys.exit(1)
    fix_utf8(sys.argv[1])