// --------Codigo--------
// Felicidade = F
// Neutro = N
// Duvida = D
// Surpresa = S

const state = {
        volume: false,
        prevExpression: "N",
    },
    header = genAudioHeader(Number(RATE), Number(BPS), Number(CHANNELS)),
    videoPlayer = document.querySelector("#video-player"),
    ws = new WebSocket(`ws://${SERVER_IP}:3000`);

let audioContext = null,
    gainNode = null;

ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case "control":
        case "fex":
            if (message.fex != state.prevExpression) {
                videoPlayer.src = `/videos/cut/${state.prevExpression}${message.fex}.mp4`;
                console.log(state.prevExpression + message.fex);
                state.prevExpression = message.fex;
                videoPlayer.play();
            }
            break;
        case "interface_audio":
            if (audioContext !== null) {
                const binaryData = atob(message.media);
                const arrayBuffer = new ArrayBuffer(binaryData.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < binaryData.length; i++) {
                    view[i] = binaryData.charCodeAt(i);
                }
                const totalBuffer = new Uint8Array(header.length + view.length);
                totalBuffer.set(header);
                totalBuffer.set(view, header.length);
                audioContext.decodeAudioData(totalBuffer.buffer, (buffer) => {
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;

                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    source.start();
                });
            }
            break;
    }
});

function genAudioHeader(sampleRate, bitsPerSample, channels) {
    function concatArrays(arr1, arr2) {
        const result = new Uint8Array(arr1.length + arr2.length);
        result.set(arr1);
        result.set(arr2, arr1.length);
        return result;
    }

    function stringToUint8Array(str) {
        const result = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            result[i] = str.charCodeAt(i);
        }
        return result;
    }

    function int16ToLittleEndianArray(value) {
        const result = new Uint8Array(2);
        result[0] = value & 0xff;
        result[1] = (value >> 8) & 0xff;
        return result;
    }

    function int32ToLittleEndianArray(value) {
        const result = new Uint8Array(4);
        result[0] = value & 0xff;
        result[1] = (value >> 8) & 0xff;
        result[2] = (value >> 16) & 0xff;
        result[3] = (value >> 24) & 0xff;
        return result;
    }

    const datasize = 2 * Math.pow(10, 9);
    let o = new Uint8Array(0);

    // RIFF Header
    o = concatArrays(o, stringToUint8Array("RIFF"));
    o = concatArrays(o, int32ToLittleEndianArray(datasize + 36));
    o = concatArrays(o, stringToUint8Array("WAVE"));

    // Format Chunk
    o = concatArrays(o, stringToUint8Array("fmt "));
    o = concatArrays(o, int32ToLittleEndianArray(16));
    o = concatArrays(o, int16ToLittleEndianArray(1)); // Format type (1 - PCM)
    o = concatArrays(o, int16ToLittleEndianArray(channels));
    o = concatArrays(o, int32ToLittleEndianArray(sampleRate));
    o = concatArrays(
        o,
        int32ToLittleEndianArray((sampleRate * channels * bitsPerSample) / 8)
    );
    o = concatArrays(
        o,
        int16ToLittleEndianArray((channels * bitsPerSample) / 8)
    );
    o = concatArrays(o, int16ToLittleEndianArray(bitsPerSample));

    // Data Chunk
    o = concatArrays(o, stringToUint8Array("data"));
    o = concatArrays(o, int32ToLittleEndianArray(datasize));

    return o;
}

const audio = document.querySelector("#audio-toggle");
audio.addEventListener("click", (event) => {
    if (audioContext === null) {
        audioContext = new AudioContext();
        gainNode = audioContext.createGain();
    }
    state.volume = !state.volume;
    gainNode.gain.value = state.volume ? 1 : 0;
    audio.src = state.volume ? "/img/volume_off.svg" : "/img/volume_on.svg";
});
