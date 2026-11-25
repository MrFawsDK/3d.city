import * as THREE from '../three/three.webgpu.js';
import { AppState } from '../AppState.js'

export class BuildTool extends THREE.Object3D {

	constructor () {

		super()

		this.type = 'Tool';
		this.space = 0.1;

		let geo = new THREE.BufferGeometry()
		let p1 = 0.5+(this.space*0.5);
		let p2 = 0.5-(this.space*0.5);
		let h = -0.02, h2 = 0;
		let v = [-p2, h2, p2, -p1, h, p1, p2, h2, p2, p1, h, p1, p1, h, -p1, p2, h2, -p2, -p2, h2, -p2, -p1, h, -p1];
		let indices = [0, 1, 2, 1, 3, 2, 3, 4, 2, 2, 4, 5, 5, 4, 6, 4, 7, 6, 7, 1, 6, 1, 0, 6];
		let n = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
		let uv = [1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0];

		geo.setIndex( indices );
		geo.setAttribute( 'position', new THREE.Float32BufferAttribute( v, 3 ) );
		geo.setAttribute( 'normal', new THREE.Float32BufferAttribute( n, 3 ) );
		geo.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );

		geo.morphAttributes.position = [];
		geo.morphAttributes.position.push( this.makeMorph(2) );
		geo.morphAttributes.position.push( this.makeMorph(3) );
		geo.morphAttributes.position.push( this.makeMorph(4, 0.5) );
		geo.morphAttributes.position.push( this.makeMorph(6, 1.5) );

		this.current = 0

		let option = AppState.isBestMaterial ? { roughness:0, metalness:0, allowOverride:false } : {allowOverride:false}
		let material = AppState.isBestMaterial ? new THREE.MeshStandardMaterial(option) : new THREE.MeshBasicMaterial(option);

		this.mesh = new THREE.Mesh( geo, material )

		this.mesh.material.depthWrite = true; 
		this.mesh.material.depthTest = false;
		//this.mesh.material.toneMapped = false;
		this.mesh.material.morphTargets = false;
		this.mesh.material.transparent = true;
		this.mesh.material.renderOrder = 1

		this.mesh2 = this.mesh.clone()
		this.mesh2.position.set(0, -0.1, 0)
		this.mesh2.material = this.mesh.material.clone()
		this.mesh2.material.color.set(0,0,0)
		this.mesh2.material.opacity = 0.5
		this.add(this.mesh2)

		this.add(this.mesh)

		this.makeGrid()

	}

	// Terrain-following tile grid around the cursor, in 3 opacity rings (inner = strongest).
	// Lives in world space (add tool.gridGroup to the scene), rebuilt only when the cursor tile changes.
	makeGrid ( r = 10 ) {

		this.gridR = r;
		this.gridKey = '';
		this.gridGroup = new THREE.Group();
		this.gridGroup.visible = false;
		this.gridRings = [];

		const rings = [ [ 3, 0.75 ], [ 6, 0.45 ], [ r, 0.2 ] ];
		for ( const [ , opacity ] of rings ) {

			const g = new THREE.BufferGeometry();
			g.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( ( 2 * r + 2 ) * ( 2 * r + 1 ) * 12 ), 3 ) );
			g.setDrawRange( 0, 0 );

			const m = new THREE.LineSegments( g, new THREE.LineBasicMaterial({
				color: 0x0c1420, transparent: true, opacity, depthWrite: false, allowOverride: false
			}) );
			m.frustumCulled = false;
			m.renderOrder = 2;
			this.gridGroup.add( m );
			this.gridRings.push( m );

		}
		this.gridLimits = rings.map( v => v[ 0 ] );

	}

	// cx, cz: cursor tile; hf(i,j): terrain height at tile corner (i-0.5, j-0.5)
	updateGrid ( cx, cz, hf ) {

		const key = cx + '_' + cz;
		if ( key === this.gridKey ) return;
		this.gridKey = key;

		const r = this.gridR, lift = 0.05;
		const out = this.gridRings.map( () => [] );
		const ring = ( di, dj ) => {
			const d = Math.max( Math.abs( di ), Math.abs( dj ) );
			return d <= this.gridLimits[ 0 ] ? 0 : d <= this.gridLimits[ 1 ] ? 1 : 2;
		};
		const P = ( i, j ) => [ i - 0.5, Math.max( hf( i, j ), 0 ) + lift, j - 0.5 ];

		for ( let i = cx - r; i <= cx + r + 1; i++ ) {
			for ( let j = cz - r; j <= cz + r + 1; j++ ) {
				// edge along z from corner (i,j) to (i,j+1)
				if ( j <= cz + r ) out[ ring( i - cx - 0.5, j - cz ) ].push( ...P( i, j ), ...P( i, j + 1 ) );
				// edge along x from corner (i,j) to (i+1,j)
				if ( i <= cx + r ) out[ ring( i - cx, j - cz - 0.5 ) ].push( ...P( i, j ), ...P( i + 1, j ) );
			}
		}

		this.gridRings.forEach( ( m, k ) => {
			const attr = m.geometry.attributes.position, n = Math.min( out[ k ].length, attr.array.length );
			attr.array.set( out[ k ].slice( 0, n ) );
			attr.needsUpdate = true;
			m.geometry.setDrawRange( 0, n / 3 );
		} );

	}

	makeMorph ( s, d = 0 ) {

		let p1 = (s*0.5)+(this.space*0.5);
		let p2 = (s*0.5)-(this.space*0.5);
		let h = -0.02, h2 = 0;

		let v = [-p2, h2, p2, -p1, h, p1, p2, h2, p2, p1, h, p1, p1, h, -p1, p2, h2, -p2, -p2, h2, -p2, -p1, h, -p1];

		let i = v.length/3, n
		while(i--){ n=i*3; v[n] += d; v[n+2] += d; }

		return new THREE.Float32BufferAttribute( v, 3 );

	}

	set color( c ) {
		this.mesh.material.color.set(c)//.convertSRGBToLinear()
		//this.mesh.material.color.set(c)//.convertLinearToSRGB()
	}

	set resize ( s ) {

		this.mesh.morphTargetInfluences[ 0 ] = 0;
		this.mesh.morphTargetInfluences[ 1 ] = 0;
		this.mesh.morphTargetInfluences[ 2 ] = 0;
		this.mesh.morphTargetInfluences[ 3 ] = 0;

		this.mesh2.morphTargetInfluences[ 0 ] = 0;
		this.mesh2.morphTargetInfluences[ 1 ] = 0;
		this.mesh2.morphTargetInfluences[ 2 ] = 0;
		this.mesh2.morphTargetInfluences[ 3 ] = 0;

		if( s==2 ) this.mesh.morphTargetInfluences[ 0 ] = 1;
		if( s==3 ) this.mesh.morphTargetInfluences[ 1 ] = 1;
		if( s==4 ) this.mesh.morphTargetInfluences[ 2 ] = 1;
		if( s==6 ) this.mesh.morphTargetInfluences[ 3 ] = 1;

		if( s==2 ) this.mesh2.morphTargetInfluences[ 0 ] = 1;
		if( s==3 ) this.mesh2.morphTargetInfluences[ 1 ] = 1;
		if( s==4 ) this.mesh2.morphTargetInfluences[ 2 ] = 1;
		if( s==6 ) this.mesh2.morphTargetInfluences[ 3 ] = 1;

	}

}


// CONSTRUCTION ANIMATION

export class Markers extends THREE.Group {

	constructor () {

		super()

		this.duration = 600; // ms
		this.queue = []

	}

	spawn( tool ){

		const m = tool.mesh.clone()
		m.material = tool.mesh.material.clone()
		m.position.copy(tool.position)
		m.visible = true
		m.material.depthTest = true;
		m.material.transparent = true;
		m.material.opacity = 0.95;
		m.startTime = Date.now()
		m.startY = m.position.y
		this.add(m)
		this.queue.push(m)

	}

	ease(t, b, c, d){
		t /= d;
        return -c * t * (t - 2) + b;
	}

	update(){
		if (!this.queue.length) return;
		const now = Date.now();
		let i = this.queue.length, m, age;
		while(i--){
			m = this.queue[i];
			age = now - m.startTime;
			if (age >= this.duration) {
				this.remove(m);
                m.geometry.dispose();
                m.material.dispose();
                this.queue.splice(i, 1);
			} else {
				const t = age / this.duration;
				//const e = this.ease(now, 1, 1.4, this.duration)
                // Pulse scale
                //const scale = 1 + Math.sin(t * Math.PI * 6) * 0.1;

                //const e = 0.4 + Math.sin(t * Math.PI * 10 ) * 0.4;
                //const scale = 1 + Math.sin(t * Math.PI * 6) * 0.2;
                m.scale.setScalar(1 + (t*0.1));
                m.position.y = m.startY + (t*0.6) 
                // Fade out in last 40%
                m.material.opacity = t < 0.6 ? 0.95 : 0.95 * (1 - (t - 0.6) / 0.4);
			}

		}

	}

}

