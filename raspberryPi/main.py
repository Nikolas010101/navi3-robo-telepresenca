"""
----Pre-requisitos----
sudo apt-get install python3-pil python3-pil.imagetk
sudo apt-get install python3-tk
pip install tkvideoplayer

--------Codigo--------
Felicidade = F
Neutro = N
Duvida = D
Surpresa = S
"""

import tkinter as tk
from tkVideoPlayer import TkinterVideo
import os
from websockets.sync.client import connect
import json
import functools

def play_next_video(event, videoplayer, playlist):
    fex = receiveData(websocket)
    fexVideo = full_path+"/"+expressaoAtual+expressaoFacial2Code[fex]+".mp4"
    queue.append(fexVideo)

    next_video = next(playlist, None)
    print('Next is:', next_video)
    if not next_video:
        return

    # Play new video only after end of current
    videoplayer.load(next_video)
    videoplayer.play()

def receiveData(websocket):
    receivedData = websocket.recv()
    receivedData = json.loads(receivedData.strip("[]"))
    fex = receivedData["fex"]
    print(fex)

    return fex

# Anota todos os nomes de videos em uma lista
absPath = os.path.dirname(__file__)
relativePath = "videoFiles"
full_path = os.path.join(absPath, relativePath)
nomeVideos = []

for diretorio, _, arquivos in os.walk(full_path):
    for arquivo in arquivos:
        nomeVideos.append(arquivo)

expressaoFacial2Code = {"happy":"F", "neutral":"N", "doubt":"D", "surprise":"S"}
expressaoAtual = "N"
queue = []

# Conexão ws com servidor
with connect("ws://localhost:3000") as websocket:
    fex = receiveData(websocket)
    fexVideo = full_path+"/"+expressaoAtual+expressaoFacial2Code[fex]+".mp4"
    queue.append(fexVideo)

    if __name__ == "__main__":
        root = tk.Tk()
        root.geometry("800x500")
        videoplayer = TkinterVideo(master=root, scaled=True)

        # Use 'iter' to work with 'next' in callback
        playlist = iter(queue)

        # After end of video, use callback to run next video from playlist
        videoplayer.bind(
            "<<Ended>>",
            functools.partial(
                play_next_video,
                videoplayer=videoplayer,
                playlist=playlist,
            ),
        )

    # Play first video from playlist
    videoplayer.load(next(playlist))
    videoplayer.pack(expand=True, fill="both")
    videoplayer.play()

    root.mainloop()
