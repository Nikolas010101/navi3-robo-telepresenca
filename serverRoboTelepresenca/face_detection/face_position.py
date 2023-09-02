import cv2

face_detector = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
cap = cv2.VideoCapture(0)


# Load functions
def make_rect(img):
    faces = face_detector.detectMultiScale(img, 1.3, 5)

    if not len(faces):
        return img

    x, y, w, h = faces[0]
    print(f"Centro do rosto em: {x+w/2}, {y+h/2}")
    face_with_rect = cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
    return face_with_rect


while True:
    ret, frame = cap.read()
    face = make_rect(frame)
    
    cv2.imshow("Rosto", face)

    if cv2.waitKey(1) == 13:  # espaço
        break

cap.release()
cv2.destroyAllWindows()
