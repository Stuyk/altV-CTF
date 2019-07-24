function playAudio(name) {
	var audio = new Audio(`./flagAudio/${name}.ogg`);
	audio.loop = false;
	audio.volume = 0.35;
	audio.play();
}

if ('alt' in window) {
	alt.on('playAudio', playAudio);
}