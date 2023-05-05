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

# Conexão ws com servidor
with connect("ws://localhost:3000") as websocket:
    receivedData = websocket.recv()
    receivedData = json.loads(receivedData.strip("[]"))
    fex = receivedData["fex"]
    
# Anota todos os nomes de videos em uma lista
absPath = os.path.dirname(__file__)
relativePath = "videoFiles"
full_path = os.path.join(absPath, relativePath)
nomeVideos = []

for diretorio, _, arquivos in os.walk(full_path):
    for arquivo in arquivos:
        nomeVideos.append(arquivo)

# Converte expressao facial em ingles para o codigo adotado
expressaoFacial2Code = {"happy":"F", "neutral":"N", "doubt":"D", "surprise":"S"}
expressaoAtual = ""
expressaoNova = ""

# Interface para execucao de video
root = tk.Tk()
root.geometry("800x500")

videoplayer = TkinterVideo(master=root, scaled=False)
videoplayer.pack(expand=True, fill="both")
videoplayer.load(full_path + "/DF.mp4")
videoplayer.play()

root.mainloop()