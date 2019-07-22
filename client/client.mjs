import * as alt from 'alt';
import * as native from 'natives';

const teamOptions = [];
const flagPlaceholders = [];
var isMenuOpen = false;

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

alt.on('update', () => {
	native.restorePlayerStamina(alt.Player.local.scriptID, 100);

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
			
			native.drawMarker(
				1, // type
				placeholder.pos.x, //x
				placeholder.pos.y, //y
				placeholder.pos.z, //z
				0, //dir.x
				0, //dir.y
				0, //dir.z
				0, //rot.x
				0, //rot.y
				0, //rot.z
				1, //scale.x
				1, //scale.y
				50, //scale.z
				color.r, //r
				color.g, //g
				color.b, //b
				100, //alpha
				false, // ?
				false, // ?
				2, // ?
				false, // ?
				undefined,
				undefined,
				false
			);
		});
	}

	if (!isMenuOpen) {
		// Enable Controls, Unblur Background, Show Crosshair
		native.enableAllControlActions(0);
		native.transitionFromBlurred(100);
		native.showHudComponentThisFrame(14);
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

alt.on('joinTeam', (teamName) => {
	alt.emitServer('joinTeam', teamName);
});