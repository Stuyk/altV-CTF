import * as alt from 'alt';
import * as native from 'natives';

const teamOptions = [];
const flagPlaceholders = [];
var isMenuOpen = false;
var blueFlagDrop = undefined; // Vector3
var redFlagDrop = undefined; // Vector3
var hasRedFlag = undefined; // Player
var hasBlueFlag = undefined; // Player
var redScore = 0;
var blueScore = 0;

class TeamOption {
	constructor(x, y, width, height, text, r, g, b, a, event, eventParam) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.text = text;
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
		this.event = event;
		this.eventParam = eventParam;
	}

	render() {
		// isHovered
		if (this.isMouseHovered(this.x, this.y, this.width, this.height)) {
			// Hover sound.
			if (!this.playedHoverSound) {
				this.playedHoverSound = true;
				native.playSoundFrontend(-1,  'NAV_UP_DOWN', 'HUD_FREEMODE_SOUNDSET', true);
			}
			
			native.drawRect(this.x, this.y, this.width, this.height, this.r, this.g, this.b, this.a - 50);
			drawText(this.text, this.x, this.y + (this.height / 4), 0.5, 255, 255, 255, 255);

			// Click function.
			if (!native.isDisabledControlJustPressed(0, 24))
				return;

			// Close menu / emit function.
			isMenuOpen = false;
			native.playSoundFrontend(-1,  'SELECT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true);
			native.transitionFromBlurred(500);
			alt.emit(this.event, this.eventParam);
			return;
		}

		// isNotHovered
		this.playedHoverSound = false;
		native.drawRect(this.x, this.y, this.width, this.height,this.r, this.g, this.b, this.a);
		drawText(this.text, this.x, this.y + (this.height / 4), 0.5, 255, 255, 255, 255);
	}

	isMouseHovered(xPos, yPos, width, height) {
		const cursorPos = {
			x: native.getControlNormal(0, 239),
			y: native.getControlNormal(0, 240)
		}
	
		if (cursorPos.x < xPos - (width / 2))
			return false;
	
		if (cursorPos.x > xPos + (width / 2))
			return false;
	
		if (cursorPos.y < yPos - (height / 2))
			return false;
	
		if (cursorPos.y > yPos + (height / 2))
			return false;
	
		return true;
	}
}

// Add Team Options
teamOptions.push(new TeamOption(0.25, 0.5, 0.5, 1, 'Red', 255, 0, 0, 100, 'joinTeam', 'red'));
teamOptions.push(new TeamOption(0.75, 0.5, 0.5, 1, 'Blue', 0, 0, 255, 100, 'joinTeam', 'blue'));

alt.on('update', () => {
	if (hasRedFlag === alt.Player.local || hasBlueFlag === alt.Player.local) {
		native.setSuperJumpThisFrame(alt.Player.local.scriptID);
	}

	native.restorePlayerStamina(alt.Player.local.scriptID, 100);

	// Draw red flag drop.
	if (redFlagDrop !== undefined) {
		drawMarker(5, redFlagDrop, 1, 1, 25, 255, 0, 0, 150);
		var res = native.getScreenCoordFromWorldCoord(redFlagDrop.x, redFlagDrop.y, redFlagDrop.z, undefined, undefined);
		if (res[0]) {
			if (Distance(alt.Player.local.pos, redFlagDrop) <= 10) {
				drawText('Red Flag', res[1], res[2], 0.5, 255, 255, 255, 255);
			}
		}
	}

	// Draw blue flag drop.
	if (blueFlagDrop !== undefined) {
		drawMarker(5, blueFlagDrop, 1, 1, 25, 0, 0, 255, 150);
		var res = native.getScreenCoordFromWorldCoord(blueFlagDrop.x, blueFlagDrop.y, blueFlagDrop.z, undefined, undefined);
		if (res[0]) {
			if (Distance(alt.Player.local.pos, blueFlagDrop) <= 10) {
				drawText('Blue Flag', res[1], res[2], 0.5, 255, 255, 255, 255);
			}
		}
	}

	if (flagPlaceholders.length >= 1) {
		flagPlaceholders.forEach((placeholder) => {
			var color = {
				r: 255,
				g: 0,
				b: 0,
			}

			if (placeholder.type === 'blue') {
				color.r = 0;
				color.b = 255;
			}

			drawMarker(1, placeholder.pos, 1, 1, 25, color.r, color.g, color.b, 50);
		});
	}

	// Blue Flag Holder
	if (hasBlueFlag !== undefined && hasBlueFlag !== null) {
		var pos = hasBlueFlag.pos;
		pos.z += 1.5;
		drawMarker(0, pos, 1, 1, 1, 0, 0, 255, 50);

		var res = native.getScreenCoordFromWorldCoord(pos.x, pos.y, pos.z, undefined, undefined);
		if (res[0]) {
			if (Distance(alt.Player.local.pos, pos) <= 10) {
				drawText('Has Blue Flag', res[1], res[2], 0.5, 255, 255, 255, 255);
			}
		}
	}

	// Red Flag Holder
	if (hasRedFlag !== undefined && hasRedFlag !== null) {
		var pos = hasRedFlag.pos;
		pos.z += 1.5;
		drawMarker(0, pos, 1, 1, 1, 255, 0, 0, 50);

		var res = native.getScreenCoordFromWorldCoord(pos.x, pos.y, pos.z, undefined, undefined);
		if (res[0]) {
			if (Distance(alt.Player.local.pos, pos) <= 10) {
				drawText('Has Red Flag', res[1], res[2], 0.5, 255, 255, 255, 255);
			}
		}
	}

	if (!isMenuOpen) {
		// Enable Controls, Unblur Background, Show Crosshair
		native.enableAllControlActions(0);
		native.transitionFromBlurred(100);
		native.showHudComponentThisFrame(14);

		// Draw Scores
		drawText(`Red Score: ${redScore}`, 0.88, 0.15, 0.5, 255, 255, 255, 255);
		drawText(`Blue Score: ${blueScore}`, 0.88, 0.20, 0.5, 255, 255, 255, 255);
		drawText(`Change Team: /showmenu`, 0.88, 0.25, 0.5, 255, 255, 255, 255);
		return;
	}

	if (teamOptions.length <= 0) {
		return;
	}

	// Blur Background, Disable Controls, Disable Radar
	native.transitionToBlurred(100);
	native.showCursorThisFrame();
	native.hideHudAndRadarThisFrame();
	native.disableControlAction(0, 1, true);
	native.disableControlAction(0, 2, true);
	native.disableControlAction(0, 142, true);
	native.disableControlAction(0, 106, true);

	// Render Menu
	for(var i = 0; i < teamOptions.length; i++) {
		teamOptions[i].render();
	}
});

alt.onServer('showMenu', () => {
	isMenuOpen = true;
});

alt.onServer('hideMenu', () => {
	isMenuOpen = false;
});

alt.onServer('addPlaceholder', (team, location) => {
	let temp = {
		type: team,
		pos: location
	}

	// Below ground / close to ground.
	temp.pos.z -= 1;
	
	flagPlaceholders.push(temp);
});

alt.onServer('addFlagDrop', (team, location) => {
	if (team === 'red') {
		redFlagDrop = location;

		if (hasRedFlag === alt.Player.local) {
			native.setRunSprintMultiplierForPlayer(alt.Player.local.scriptID, 1.00);
		}

		hasRedFlag = undefined;
	} else {
		blueFlagDrop = location;

		if (hasBlueFlag === alt.Player.local) {
			native.setRunSprintMultiplierForPlayer(alt.Player.local.scriptID, 1.00);
		}

		hasBlueFlag = undefined;
	}
});

alt.onServer('removeFlagDrop', (team) => {
	if (team === 'red') {
		redFlagDrop = undefined;
	} else {
		blueFlagDrop = undefined;
	}
});

alt.onServer('hasFlag', (player, team) => {
	if (player === alt.Player.local) {
		native.setRunSprintMultiplierForPlayer(alt.Player.local.scriptID, 1.49);
	}
	
	if (team === 'blue') {
		// red team flag holder
		hasRedFlag = player;
	} else {
		// blue team flag holder
		hasBlueFlag = player;
	}
});

alt.onServer('scoredFlag', (teamFlag) => {
	if (teamFlag === 'red') {
		hasRedFlag = undefined;
	} else {
		hasBlueFlag = undefined;
	}
});

alt.onServer('updateScore', (redscore, bluescore) => {
	redScore = redscore;
	blueScore = bluescore;
});

alt.on('joinTeam', (teamName) => {
	alt.emitServer('joinTeam', teamName);
});

alt.on('keydown', (key) => {
	if (key === 'X'.charCodeAt(0)) {
		alt.emitServer('dropFlag');
	}
});

function drawText(msg, x, y, scale, r, g, b, a) {
	native.setUiLayer(50);
	native.beginTextCommandDisplayText('STRING');
	native.addTextComponentSubstringPlayerName(msg);
	native.setTextFont(4);
	native.setTextScale(1, scale);
	native.setTextWrap(0.0, 1.0);
	native.setTextCentre(true);
	native.setTextColour(r, g, b, a);
	native.setTextOutline();
	native.endTextCommandDisplayText(x, y)
}

function drawMarker(type, pos, scaleX, scaleY, scaleZ, r, g, b, a) {
	native.drawMarker(
		type, // type
		pos.x, //x
		pos.y, //y
		pos.z, //z
		0, //dir.x
		0, //dir.y
		0, //dir.z
		0, //rot.x
		0, //rot.y
		0, //rot.z
		scaleX, //scale.x
		scaleY, //scale.y
		scaleZ, //scale.z
		r, //r
		g, //g
		b, //b
		a, //alpha
		false, // ?
		false, // ?
		2, // ?
		false, // ?
		undefined,
		undefined,
		false
	);
}

function Distance(vector1, vector2) {
	if (vector1 === undefined || vector2 === undefined) {
		throw new Error('AddVector => vector1 or vector2 is undefined');
	}
	return Math.sqrt(Math.pow(vector1.x - vector2.x, 2) + Math.pow(vector1.y - vector2.y, 2) + Math.pow(vector1.z - vector2.z, 2));
}