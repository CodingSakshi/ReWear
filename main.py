import sys
from pyfiles import face_utils as fs

def main(arg1, arg2):
    # Perform operations and return results
    result1 = fs.is_face_detected(arg1)
    # result1 = f"Argument 1: {arg1}"


    if arg2 == 'Found Person':
        folder = 'images/missing'
        result2 = fs.match_faces(arg1, folder)
    elif arg2 == 'Missing Person':
        folder = 'images/found'
        result2 = fs.match_faces(arg1, folder)
    else:
        result2 = False
    
    
    # Return results as output
    return result1, result2


# images/found/60e66a1a-d010-4163-8e3e-7e7ef3a4f57e.jpg



if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Please provide exactly 2 arguments")
        sys.exit(1)

    # Get the arguments passed from Node.js
    argument1 = sys.argv[1]
    argument2 = sys.argv[2]

    # argument1 = 'images/found/60e66a1a-d010-4163-8e3e-7e7ef3a4f57e.jpg'
    # argument2 = 'images/missing'

    # Get the results
    result1, result2 = main(argument1, argument2)

    # Print the results (so Node.js can capture this output)
    print(result1)
    print(result2)
