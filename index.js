
module.exports = function xp(dispatch){
	const command = dispatch.command || dispatch.require.command;
	// 1000 = 1sec 
	let	hooks = [],
		enabled = false,
		boxEvent = null,
		gacha_detected = false,
		isLooting = false,
		location = null,
		timer = null,
		delay = 1500,
		useDelay = false,
		statOpened = 0,
		statUsed = 0,
		statStarted = null,
		scanning = false,
		inventory = null;
		
	command.add('xp', () => {
		if(!enabled && !scanning)
		{
			scanning = true;
			load();
			command.message('Please normally use a advance skill book now and the script will continue ');
		}
		else
		{
			stop();
		}
	});
		
	command.add('xpdelay', (arg) => {
		if(arg === "0")
		{
			useDelay = false;
			delay = 1500;
			command.message("Turning OFF minimum advance skill book delay, enjoy the speed");
		}
		else if(!isNaN(arg))
		{
			useDelay = true;
			delay = parseInt(arg);
			command.message("Minimum advance skill book delay is set to: " + (delay / 1000) + " sec");
		}
		else
		{
			command.message("Minimum advance skill book delay is set to: " + (useDelay ? (delay / 1000) + " sec" : "no delay" ));
		}
    });
	
	dispatch.hook('C_PLAYER_LOCATION', 5, event =>{location = event});
	
	dispatch.game.initialize("inventory");
	
	dispatch.game.inventory.on('update', () => {
		if(!enabled) return;
		
		isLooting = false; // event comes only after all S_SYSTEM_MESSAGE_LOOT_ITEM (probably)
	});
	
	function load()
	{
		
		hook('C_USE_ITEM', 3, event =>{
			if(!scanning) return
		
			if(scanning){
				boxEvent = event;
				boxEvent.dbid = 0n; // to open all inv slots
				command.message("advance skill book set to: "+event.id+", proceeding to append it with "  + (useDelay ? "a minimum " + (delay / 1000) + " sec delay" : "no delay" ));
				scanning = false;
				
				let d = new Date();
				statStarted = d.getTime();
				enabled = true;
				timer = setTimeout(openBox,delay);
				return true; // for consistency of sent data
			}
		});
		
		hook('S_SYSTEM_MESSAGE_LOOT_ITEM', 1, event => {
			if(!gacha_detected && !isLooting && boxEvent)
			{
				isLooting = true;
				statOpened++;
				if(!useDelay)
				{
					clearTimeout(timer);
					openBox();
				}
			}
		});
		
		hook('S_GACHA_END', 1, event => {
			if(boxEvent)
			{
				statOpened++;
				if(!useDelay)
				{
					clearTimeout(timer);
					openBox();
				}
			}
		});
		
		hook('S_SYSTEM_MESSAGE', 1, event => {
			const msg = dispatch.parseSystemMessage(event.message);
			if(msg.id === 'SMT_ITEM_MIX_NEED_METERIAL' || msg.id === 'SMT_CANT_CONVERT_NOW')
			{
				command.message("advance skill book can not be append anymore, stopping");
				stop();
			}
        });
		
		hook('S_GACHA_START', 1, event => {
			gacha_detected = true;
			dispatch.toServer('C_GACHA_TRY', 1,{
				id:event.id
			})
        });
			
	}
	
	function openBox() 
	{
		if(dispatch.game.inventory.getTotalAmount(boxEvent.id) > 0)
		{
			boxEvent.loc = location.loc;
			boxEvent.w = location.w;
			dispatch.toServer('C_USE_ITEM', 3, boxEvent);
			if(useDelay)
			{
				statUsed++;	// counter for used items other than advance skill book
			}
			timer = setTimeout(openBox,delay);
		}
		else
		{
			command.message("You ran out of advance skill book, stopping");
			stop();
		}
	}
	
	function addZero(i) 
	{
		if (i < 10) {
			i = "0" + i;
		}
		return i;
	}

	function stop() 
	{
		unload();
		if(scanning)
		{
			scanning = false;
			command.message('Scanning for a advance skill book is aborted');
		}
		else
		{
			clearTimeout(timer);
			enabled = false;
			gacha_detected = false;
			boxEvent = null;
			if(useDelay && statOpened == 0)
			{
				statOpened = statUsed;
			}
			let d = new Date();
			let t = d.getTime();
			let timeElapsedMSec = t-statStarted;
			d = new Date(1970, 0, 1); // Epoch
			d.setMilliseconds(timeElapsedMSec);
			let h = addZero(d.getHours());
			let m = addZero(d.getMinutes());
			let s = addZero(d.getSeconds());
			command.message('xp stopped. append: ' + statOpened + ' advance skill book. Time elapsed: ' + (h + ":" + m + ":" + s) + ". Per book: " + ((timeElapsedMSec / statOpened) / 1000).toPrecision(2) + " sec");
			statOpened = 0;
			statUsed = 0;
		}
	}
	
	function unload() {
		if(hooks.length) {
			for(let h of hooks) dispatch.unhook(h)

			hooks = []
		}
	}

	function hook() {
		hooks.push(dispatch.hook(...arguments))
	}
}
