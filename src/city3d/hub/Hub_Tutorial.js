import { AppState } from '../../AppState.js'

//------------------------------------------------------//
//            HUB TUTORIAL (guided first steps)          //
//------------------------------------------------------//
// Highlights the thing to press, explains it, and moves on
// when the player really does it (select tool / place on map).
// Start: Hub.startTutorial()  -  Restart anytime: key H.

const STORE_KEY = '3DcityTutorialDone';

// tool ids from Base.toolSet
const T = { residential:1, commercial:2, industrial:3, road:7, bulldozer:8, wire:11, coal:10 };

export class Hub_Tutorial {

	constructor ( parent ) {

		this.hub = parent;
		this.active = false;
		this.index = 0;
		this.count = 0;
		this.advancing = false;

		this.steps = this.makeSteps();
		this.build();

	}

	//----------------------------------------------- steps

	makeSteps () {

		const tool = ( name ) => () => this.toolButton( T[ name ] );
		const select = ( name, title, text ) => ({ title, text, target: tool( name ), done: { type:'tool', name } });

		return [
			{ title:'Welcome, Mayor!', next:true,
			  text:'Let\'s build your first town in a few quick steps. A city needs <b>power</b>, <b>roads</b> and <b>zones</b> where people live and work.' },

			{ title:'Look around', next:true,
			  text:'<b>Mouse wheel</b> zoom &nbsp;·&nbsp; <b>Right-drag</b> move &nbsp;·&nbsp; <b>Middle-drag</b> rotate &nbsp;·&nbsp; <b>WASD / arrows</b> move.<br>Tip: pick a flat area near water.' },

			select( 'coal', '1 · Power', 'Everything needs electricity. Press the <b>Coal power plant</b> in the build bar.' ),
			{ title:'1 · Power', needs:'coal', done:{ type:'place', name:'coal' },
			  text:'Now <b>click on flat land</b> to place it. It shows a construction site first, big buildings take longer.' },

			select( 'road', '2 · Roads', 'Next, a road. Press the <b>Road</b> tool.' ),
			{ title:'2 · Roads', needs:'road', done:{ type:'place', name:'road', count:5 },
			  text:'<b>Click and drag</b> a road next to the power plant. It snaps to a straight line (hold <b>Shift</b> for free drawing).' },

			select( 'residential', '3 · Homes', 'People need somewhere to live. Press <b>Residential</b> (green).' ),
			{ title:'3 · Homes', needs:'residential', done:{ type:'place', name:'residential', count:2 },
			  text:'<b>Drag</b> along the road to paint residential zones. They snap to a 3×3 grid, so they never overlap.' },

			select( 'industrial', '4 · Jobs', 'Now jobs. Press <b>Industrial</b> (yellow).' ),
			{ title:'4 · Jobs', needs:'industrial', done:{ type:'place', name:'industrial', count:1 },
			  text:'Place an industrial zone a bit away from the homes, factories pollute.' },

			select( 'commercial', '5 · Shops', 'And shops. Press <b>Commercial</b> (blue).' ),
			{ title:'5 · Shops', needs:'commercial', done:{ type:'place', name:'commercial', count:1 },
			  text:'Put a commercial zone between homes and industry, close to the road.' },

			select( 'wire', '6 · Connect power', 'Zones only grow with electricity. Press the <b>Power line</b> tool.' ),
			{ title:'6 · Connect power', needs:'wire', done:{ type:'place', name:'wire', count:6 },
			  text:'<b>Drag a power line</b> from the power plant to your zones. Touching zones share power with each other.' },

			{ title:'Game speed', next:true, target:() => this.speedButtons(),
			  text:'Use these buttons to <b>pause</b> or speed up time. Your city starts growing once the simulation runs.' },

			{ title:'Demand bars', next:true, target:() => this.rciBars(),
			  text:'These bars show what your city wants: <b>R</b>esidential, <b>C</b>ommercial, <b>I</b>ndustrial. A bar going up means: build more of that zone.' },

			{ title:'More buildings', next:true, target:() => this.hub.buildHub && this.hub.buildHub.btnService,
			  text:'The <b>Service</b> tab has police, fire stations, hospitals, schools and more. Watch the message at the top, it tells you what the city needs.' },

			{ title:'You\'re ready!', next:true, last:true,
			  text:'Keep an eye on your money, and have fun!<br><b>G</b> grid &nbsp;·&nbsp; <b>N</b> day/night &nbsp;·&nbsp; <b>H</b> replay this guide.' }
		];

	}

	//----------------------------------------------- targets

	buildHub () { return this.hub.buildHub; }

	toolButton ( id ) {

		const b = this.buildHub();
		if( !b ) return null;
		// make sure the BUILD tab is showing
		if( b.tool.indexOf( id ) === -1 ) b.switchMenu( 0 );
		return b.innerb.children[ b.tool.indexOf( id ) ] || null;

	}

	speedButtons () {

		const b = this.buildHub();
		return b ? b.speedButton : null;

	}

	rciBars () {

		const b = this.buildHub();
		return b ? b.rci : null;

	}

	// union of one element or an array of elements, in screen px
	rectOf ( t ) {

		if( !t ) return null;
		const list = Array.isArray( t ) ? t : [ t ];
		let l = 1e9, tp = 1e9, r = -1e9, bt = -1e9;
		for( const e of list ){
			if( !e ) continue;
			const q = e.getBoundingClientRect();
			if( q.width === 0 && q.height === 0 ) continue;
			l = Math.min( l, q.left ); tp = Math.min( tp, q.top );
			r = Math.max( r, q.right ); bt = Math.max( bt, q.bottom );
		}
		return r < l ? null : { left:l, top:tp, width:r - l, height:bt - tp };

	}

	//----------------------------------------------- DOM

	build () {

		if( !document.getElementById( 'tutorial-style' ) ){
			const st = document.createElement( 'style' );
			st.id = 'tutorial-style';
			st.textContent =
				'@keyframes tutPulse{0%,100%{box-shadow:0 0 0 100vmax rgba(5,10,20,.55),0 0 0 0 rgba(116,191,255,.9)}' +
				'50%{box-shadow:0 0 0 100vmax rgba(5,10,20,.55),0 0 0 12px rgba(116,191,255,0)}}' +
				'.tut-btn{cursor:pointer;border:0;border-radius:8px;padding:8px 16px;font:700 13px var(--font-ui);}' +
				'.tut-btn:hover{filter:brightness(1.15)}';
			document.head.appendChild( st );
		}

		this.root = document.createElement( 'div' );
		this.root.style.cssText = 'position:fixed; inset:0; z-index:60; pointer-events:none; display:none;';

		this.dim = document.createElement( 'div' );
		this.dim.style.cssText = 'position:absolute; inset:0; background:rgba(5,10,20,.55);';
		this.root.appendChild( this.dim );

		this.spot = document.createElement( 'div' );
		this.spot.style.cssText = 'position:absolute; border:3px solid #74bfff; border-radius:10px; display:none;' +
			'animation:tutPulse 1.4s ease-in-out infinite; transition:left .25s,top .25s,width .25s,height .25s;';
		this.root.appendChild( this.spot );

		this.card = document.createElement( 'div' );
		this.card.style.cssText = 'position:absolute; width:min(92vw,380px); padding:14px 16px 12px; border-radius:14px;' +
			'background:rgba(20,30,48,.96); border:1px solid var(--c-border-hi); box-shadow:var(--shadow-panel);' +
			'color:var(--c-text); font:13px/1.45 var(--font-ui); text-align:left; pointer-events:auto; user-select:none;';
		this.root.appendChild( this.card );

		this.cTitle = document.createElement( 'div' );
		this.cTitle.style.cssText = 'font:700 16px var(--font-ui); color:#74bfff; margin-bottom:6px;';
		this.cText = document.createElement( 'div' );
		this.cFoot = document.createElement( 'div' );
		this.cFoot.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-top:12px; gap:10px;';

		this.cProg = document.createElement( 'span' );
		this.cProg.style.cssText = 'color:var(--c-text-dim); font-size:12px;';
		this.btnSkip = document.createElement( 'button' );
		this.btnSkip.className = 'tut-btn';
		this.btnSkip.style.cssText = 'background:none; color:var(--c-text-dim); padding:8px 6px;';
		this.btnSkip.textContent = 'Skip guide';
		this.btnNext = document.createElement( 'button' );
		this.btnNext.className = 'tut-btn';
		this.btnNext.style.cssText = 'background:#4a9edd; color:#fff;';
		this.btnNext.textContent = 'Next';

		const right = document.createElement( 'span' );
		right.style.cssText = 'display:flex; align-items:center; gap:6px;';
		right.append( this.btnSkip, this.btnNext );
		this.cFoot.append( this.cProg, right );
		this.card.append( this.cTitle, this.cText, this.cFoot );

		this.btnSkip.addEventListener( 'click', () => this.finish() );
		this.btnNext.addEventListener( 'click', () => { if( this.steps[ this.index ].last ) this.finish(); else this.goto( this.index + 1 ); } );

		document.body.appendChild( this.root );

	}

	//----------------------------------------------- flow

	start () {

		if( this.active ) return;
		this.active = true;
		this.root.style.display = 'block';
		this.goto( 0 );
		this.loop();

	}

	finish () {

		this.active = false;
		this.root.style.display = 'none';
		try { localStorage.setItem( STORE_KEY, '1' ); } catch ( e ) {}

	}

	goto ( i ) {

		this.index = Math.max( 0, Math.min( i, this.steps.length - 1 ) );
		this.count = 0;
		this.advancing = false;

		const s = this.steps[ this.index ];
		this.cTitle.textContent = s.title;
		this.cText.innerHTML = s.text;
		this.cProg.textContent = ( this.index + 1 ) + ' / ' + this.steps.length;
		this.btnNext.style.display = s.next ? '' : 'none';
		this.btnNext.textContent = s.last ? 'Start playing' : 'Next';
		this.card.style.borderColor = '';

		// already satisfied? (e.g. tool already selected)
		if( s.done && s.done.type === 'tool' && this.currentToolName() === s.done.name ) this.complete();

	}

	currentToolName () {

		const t = AppState.view3d && AppState.view3d.currentTool;
		return t ? t.tool : null;

	}

	// called by the game: ('tool', name) when a tool is picked, ('place', name) when something is built
	notify ( type, name ) {

		if( !this.active || this.advancing ) return;
		const d = this.steps[ this.index ].done;
		if( !d || d.type !== type || d.name !== name ) return;

		if( type === 'place' ){
			this.count++;
			if( this.count < ( d.count || 1 ) ) return;
		}
		this.complete();

	}

	complete () {

		if( this.advancing ) return;
		this.advancing = true;
		this.card.style.borderColor = '#4bcc7a';
		this.cTitle.textContent = '✔ ' + this.steps[ this.index ].title;
		setTimeout( () => { if( this.active ) this.goto( this.index + 1 ); }, 700 );

	}

	//----------------------------------------------- per-frame layout

	loop () {

		if( !this.active ) return;
		requestAnimationFrame( () => this.loop() );

		const s = this.steps[ this.index ];

		// place step but the tool got deselected: go back to the "select" step
		if( s.needs && !this.advancing && this.currentToolName() !== s.needs ) { this.goto( this.index - 1 ); return; }

		const r = this.rectOf( s.target ? s.target() : null );
		const vw = window.innerWidth, vh = window.innerHeight;
		const cw = this.card.offsetWidth, ch = this.card.offsetHeight;

		if( r ){
			const p = 6;
			this.spot.style.display = 'block';
			this.spot.style.left = ( r.left - p ) + 'px';
			this.spot.style.top = ( r.top - p ) + 'px';
			this.spot.style.width = ( r.width + p * 2 ) + 'px';
			this.spot.style.height = ( r.height + p * 2 ) + 'px';
			this.dim.style.display = 'none';

			let x = r.left + r.width / 2 - cw / 2;
			let y = r.top > vh / 2 ? r.top - ch - 22 : r.top + r.height + 22;
			this.card.style.left = Math.max( 10, Math.min( x, vw - cw - 10 ) ) + 'px';
			this.card.style.top = Math.max( 10, Math.min( y, vh - ch - 10 ) ) + 'px';
		} else {
			this.spot.style.display = 'none';
			const centered = !!s.next;     // intro/info cards: dim + centre; action cards stay out of the way
			this.dim.style.display = centered ? 'block' : 'none';
			this.card.style.left = Math.max( 10, ( vw - cw ) / 2 ) + 'px';
			this.card.style.top = centered ? Math.max( 10, ( vh - ch ) / 2 ) + 'px' : '110px';
		}

	}

}

export const tutorialDone = () => {

	try { return !!localStorage.getItem( STORE_KEY ); } catch ( e ) { return false; }

};
