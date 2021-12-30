const ElementName = `uv-label-editor`;

export default ElementName; 



function GetUv(Event,GrabOffsetXy)
{
	function Range(Min,Max,Value)
	{
		return (Value-Min)/(Max-Min);
	}
	
	
	//	.target could be a child. .currentTarget is the element the event
	//	was actually attached to
	const Parent = Event.currentTarget;
	const ParentRect = Parent.getBoundingClientRect();

/*	
	//	the event's position may be a child (.target) of the parent
	//	so we need to get the total offset
	let x = Event.offsetX;
	let y = Event.offsetY;
	let Target = Event.target;
	while ( Target != Parent )
	{
		x += Target.offsetLeft;
		y += Target.offsetTop;
		if ( !Target.parentElement )
			throw `Event target was never a child`;
		Target = Target.parentElement;
	}
	*/
	let x = Event.clientX;
	let y = Event.clientY;
	
	if ( GrabOffsetXy )
	{
		console.log(`apply grab offset ${GrabOffsetXy}`);
		x -= GrabOffsetXy[0];
		y -= GrabOffsetXy[1];
	}
	
	const u = Range( ParentRect.left, ParentRect.right, x ); 
	const v = Range( ParentRect.top, ParentRect.bottom, y );
	return [u,v]; 
}

export class UvLabelEditor extends HTMLElement 
{
	constructor()
	{
		super();
		
		this.onchanged = function()
		{
			console.log(`${this.ElementName()} changed`);
		};
	}
	
	static ElementName()
	{
		return ElementName;
	}
	ElementName()
	{
		return UvLabelEditor.ElementName();
	}
	
	static get observedAttributes() 
	{
		return ['labels','css','readonly','zoom'];
	}
	
	get readonly()
	{
		let ReadOnly = this.hasAttribute('readonly') ? this.getAttribute('readonly') : 'false';
		ReadOnly = ReadOnly.toLowerCase();
		return ReadOnly != 'false';
	}
	set readonly(value)
	{
		if ( value === false || value === true )
			value = `${value}`;
		this.setAttribute('readonly',value);
	}
	
	//	get labels attribute as object
	get labels()			
	{
		try
		{
			let Value = this.getAttribute('labels');
			return JSON.parse(Value);
		}
		catch(e)
		{
			return {};
		}
	}
	//	todo: detect setting an object
	set labels(Value)	
	{
		if ( typeof Value != typeof '' )
			Value = JSON.stringify(Value);
		
		const OldValue = this.getAttribute('labels');
		if ( OldValue ==  Value )
			return;
			
		this.setAttribute('labels', Value);
		this.onchanged();	
	}
	
	get css()			{	return this.getAttribute('css');	}
	set css(Css)		{	Css ? this.setAttribute('css', Css) : this.removeAttribute('css');	}
	

	SetupDom(Parent)
	{
		this.RootElement = document.createElement('div');
		this.InitialiseContainer( this.RootElement );
		
		this.Style = document.createElement('style');
		
		// attach the created elements to the shadow dom
		Parent.appendChild(this.Style);
		Parent.appendChild(this.RootElement);
	}
	
	get zoom()
	{
		if ( !this.hasAttribute('zoom') )
			return 1.0;
		let Zoom = parseFloat( this.getAttribute('zoom') );
		if ( isNaN(Zoom) )
			return 1.0;
		return Zoom;
	}
	set zoom(value)
	{
		if ( value < 0.1 )
			value = 0.1;
		if ( value > 10 )
			value = 10;
		//	todo: set style variable here
		this.setAttribute('zoom',value);
	}
	
	GetCssContent()
	{
		const ImportCss = this.css ? `@import "${this.css}";` : '';
		const Css = `
		${ImportCss}
		
		:host
		{
			--Zoom:				${this.zoom};
			--ZoomOriginX:		0.5;
			--ZoomOriginY:		0.5;
			--ZoomOriginXPercent:	calc( var(--ZoomOriginX) * 100% );
			--ZoomOriginYPercent:	calc( var(--ZoomOriginY) * 100% );
			
			--BackgroundScale:	calc( var(--Zoom) * 100% );	
			
			background-repeat:	no-repeat !important;
			background-position: var(--ZoomOriginXPercent) var(--ZoomOriginYPercent) !important;
			background-size:	var(--BackgroundScale) var(--BackgroundScale) !important;
			overflow:			hidden;
		}
		
		/* root container */
		.${this.ElementName()}
		{
			position:		relative;
			width:			100%;
			height:			100%;
			xxbackground:	yellow;
			
			transform-origin: var(--ZoomOriginXPercent) var(--ZoomOriginYPercent);
			transform:		scale( calc( 1 * var(--Zoom) ) );
		}
		
		.Label
		{
			--Size:	10px;
			--MinusHalfSize:	calc( -0.5 * var(--Size) );
			--u:	0.5;
			--v:	0.5;
			position:	absolute;
			left:		calc( var(--u)*100% );
			top:		calc( var(--v)*100% );/*gr: is this 100% of width, not height?*/
			width:		var(--Size);
			height:		var(--Size);
			border:		1px solid black;
			transform:	translate( var(--MinusHalfSize),var(--MinusHalfSize));
		}
		.Label:after
		{
			content:	attr(label);
			display:	block;
			transform:	translate( var(--Size),0px);
		}
		`;
		return Css;
	}
	
	attributeChangedCallback(name, oldValue, newValue) 
	{
		if ( name == 'labels' )
			this.UpdateLabels();
		
		if ( name == 'readonly' )
			this.UpdateContainerAttributes();
		
		if ( this.Style )
			this.Style.textContent = this.GetCssContent();
	}
	
	connectedCallback()
	{
		//	Create a shadow root
		this.Shadow = this.attachShadow({mode: 'open'});
		this.SetupDom(this.Shadow);
		this.attributeChangedCallback();
	}
	
	get TreeContainer()	{	return this.RootElement;	}

	get TreeChildren()
	{
		let Children = Array.from( this.TreeContainer.children );
		Children = Children.filter( e => e instanceof TreeNodeElement || e instanceof HTMLDivElement );
		return Children;
	}

	UpdateLabel(Key)
	{
		const Element = this.GetLabelElement(Key);
		const Value = this.labels[Key];
		
		const u = Value[0];
		const v = Value[1];
		Element.setAttribute('u',u);
		Element.setAttribute('v',v);
		Element.style.setProperty('--u', u );
		Element.style.setProperty('--v', v );
	}
	
	InitialiseContainer(Element)
	{
		function OnDragOver(Event)
		{
			if ( this.readonly )
				return;
			//	continuously called
			//console.log(`OnDragOver ${Key}`);
			Element.setAttribute('DragOver',true);
			Event.stopPropagation();
			Event.preventDefault();	//	ios to accept drop
			
			//	seems to default to copy if you dont set this
			//	ios has no link icon, nothing has move icon
			Event.dataTransfer.dropEffect = 'copy';
			//	copy then link here, drop will fail, but using link to get icon on desktop
			//Event.dataTransfer.dropEffect = 'link';
			//Event.dataTransfer.dropEffect = 'move';
			//return true;
		}
		function OnDragLeave(Event)
		{
			//console.log(`OnDragLeave ${Key}`);
			Element.removeAttribute('DragOver');
		}
		function OnDrop(Event)
		{
			if ( this.readonly )
				return;
			console.log(`OnDrop`);
			Element.removeAttribute('DragOver');
			Event.preventDefault();
			Event.stopPropagation();	//	dont need to pass to parent
			
			//	move source object to dropped object
			const DroppedKey = Event.dataTransfer.getData('text/plain');
			
			const Uv = GetUv(Event,this.GrabXy);
			this.OnDroppedKey( DroppedKey, Uv );
		}
		
		function OnMouseWheel(Event)
		{
			Event.preventDefault();
			this.zoom -= Event.deltaY * 0.01;
		}
		
		
		Element.className = this.ElementName();

		//	handle dropping new elements
		Element.addEventListener('drop',OnDrop.bind(this));
		Element.addEventListener('dragover',OnDragOver.bind(this));
		Element.addEventListener('dragleave',OnDragLeave);
		
		Element.addEventListener('wheel',OnMouseWheel.bind(this));

		this.UpdateContainerAttributes();
	}
	
	UpdateContainerAttributes()
	{
		const Element = this.RootElement;
		if ( !Element )
			return; 
		Element.setAttribute('Droppable', this.readonly );
	}
	
	OnDroppedKey(Key,uv)
	{
		const Labels = this.labels;
		Labels[Key] = uv;
		this.labels = Labels;
	}
	
	InitialiseLabel(Key,Element)
	{
		//	using HTML built in drag & drop so we can drag&drop elements in & out of this control
		function OnDragStart(Event)
		{
			console.log(`grab ${Event.offsetX},${Event.offsetY} (${Event.currentTarget.clientLeft},${Event.currentTarget.clientTop})`);
			//console.log(`OnDragStart ${Key}`);
			//Event.dataTransfer.effectAllowed = 'all';
			Event.dataTransfer.dropEffect = 'copy';	//	copy move link none
			Event.dataTransfer.setData('text/plain', Key );
			
			let GrabX = Event.offsetX;
			let GrabY = Event.offsetY;
			//	adjust for borders/margins etc. A value here means offset is relative to this
			GrabX -= Event.currentTarget.clientLeft;
			GrabY -= Event.currentTarget.clientTop;
			//	gr: still need a tiny adjustment...
			GrabX -= 1;
			GrabY -= 1;
			this.GrabXy = [GrabX,GrabY];
			
			Event.stopPropagation();	//	stops multiple objects being dragged
			//Event.preventDefault();	//	this stops drag entirely
			//return true;//	not required?
		}
		function OnDrag(Event)
		{
			//	continuously called
			//console.log(`OnDrag`);
		}
		function OnDragEnd(Event)
		{
			console.log(`OnDragEnd`);
			this.GrabXy = null;
		}
		
		Element.id = Key;
		Element.className = 'Label';
		Element.setAttribute('label',Key);
		
		//	set attribute to make it draggable
		Element.setAttribute('Draggable', true );
		//	on ios its a css choice
		//	gr: not required https://stackoverflow.com/questions/6600950/native-html5-drag-and-drop-in-mobile-safari-ipad-ipod-iphone
		//Element.style.setProperty('webkitUserDrag','element');
		//Element.style.setProperty('webkitUserDrop','element');
		Element.addEventListener('dragstart',OnDragStart.bind(this));
		Element.addEventListener('drag',OnDrag);	//	would be good to allow temporary effects
		Element.addEventListener('dragend',OnDragEnd.bind(this) );
	}
	
	SetupTreeNodeElement(Element,Address,Value,Meta)
	{
		/*
		//	we will have a collapsable children
		const ValueIsChild = Meta.ValueIsChild;
		const Key = Address[Address.length-1];
		const Indent = Address.length-1;
		
		//	for convinence, put all properties as attributes so we can easily style stuff in css
		if ( typeof Value == typeof {} )
		{
			for ( let [PropertyKey,PropertyValue] of Object.entries(Value) )
			{
				//	not all attributes names are allowed
				//	must start with a-zA-Z etc
				
				//	todo regex when this needs to get more complicated
				//	try and avoid throwing to help debugging
				if ( PropertyKey.length == 0 )
					continue;
				const KeyNumber = Number(PropertyKey[0]);
				const KeyStartsWithNumber = !isNaN(KeyNumber);
				if ( KeyStartsWithNumber )
					continue;
					
				try
				{
					Element.setAttribute(PropertyKey,PropertyValue);
				}
				catch{};
			}
		}
		
		//	set css variable
		Element.Address = Address;
		Element.Key = Key;
		Element.Value = Value;
		Element.style.setProperty(`--Indent`,Indent);
		Element.style.setProperty(`--Key`,Key);
		Element.style.setProperty(`--Value`,Value);
		Element.Droppable = Meta.Droppable;
		
		if ( Meta.Draggable )
			Element.setAttribute('Draggable',true);
		if ( Meta.Droppable )
			Element.setAttribute('Droppable',true);
		if ( Meta.Selected )
			Element.setAttribute('Selected',true);
			
		//	on ios its a css choice
		//	gr: not required https://stackoverflow.com/questions/6600950/native-html5-drag-and-drop-in-mobile-safari-ipad-ipod-iphone
		Element.style.setProperty('webkitUserDrag','element');
		Element.style.setProperty('webkitUserDrop','element');
		
		
		function OnDragOver(Event)
		{
			let CanDrop = Element.Droppable;

			//	let dragover propogate
			if ( !CanDrop )
				return;
			
			//	continuously called
			//console.log(`OnDragOver ${Key}`);
			Element.setAttribute('DragOver',true);
			Event.stopPropagation();
			Event.preventDefault();	//	ios to accept drop
			
			//	seems to default to copy if you dont set this
			//	ios has no link icon, nothing has move icon
			//Event.dataTransfer.dropEffect = 'copy';
			//	copy then link here, drop will fail, but using link to get icon on desktop
			Event.dataTransfer.dropEffect = 'link';
			//Event.dataTransfer.dropEffect = 'move';
			//return true;
		}
		function OnDragLeave(Event)
		{
			//console.log(`OnDragLeave ${Key}`);
			Element.removeAttribute('DragOver');
		}
		function OnDrop(Event)
		{
			console.log(`OnDrop ${Key}`,Element);
			let CanDrop = Element.Droppable;
			//	let dragover propogate
			if ( !CanDrop )
				return;
				
			Element.removeAttribute('DragOver');
			Event.preventDefault();
			Event.stopPropagation();	//	dont need to pass to parent
			
			//	move source object to dropped object
			const OldAddress = JSON.parse(Event.dataTransfer.getData('text/plain'));
			const NewAddress = Element.Address;
			this.MoveData(OldAddress,NewAddress);
		}
		
		function OnDragStart(Event)
		{
			//console.log(`OnDragStart ${Key}`);
			//Event.dataTransfer.effectAllowed = 'all';
			Event.dataTransfer.dropEffect = 'link';	//	copy move link none
			Event.dataTransfer.setData('text/plain', JSON.stringify(Address) );
			
			Event.stopPropagation();	//	stops multiple objects being dragged
			//Event.preventDefault();	//	this stops drag entirely
			//return true;//	not required?
		}
		
		function OnDragEnd(Event)
		{
			//console.log(`OnDragEnd ${Key}`);
			Element.removeAttribute('DragOver');			
			
			//	dont need to tell parent
			Event.stopPropagation();
		}
		
		function OnDrag(Event)
		{
			//	continuously called
			//console.log(`OnDrag`);
		}
		function OnDragEnter(Event)
		{
			let CanDrop = Element.Droppable;
			if ( !CanDrop )
				return;
			//console.log(`OnDragEnter ${Key}`);
			//	this to allow this as a drop target
			Event.preventDefault();
			return true;
		}
		
		Element.addEventListener('dragstart',OnDragStart);
		Element.addEventListener('dragenter',OnDragEnter);
		Element.addEventListener('drag',OnDrag);	//	would be good to allow temporary effects
		Element.addEventListener('dragend',OnDragEnd);

		Element.addEventListener('drop',OnDrop.bind(this));
		Element.addEventListener('dragover',OnDragOver);
		Element.addEventListener('dragleave',OnDragLeave);
		
		Element.onclick = function(Event)
		{
			const AppendSelect = Event.shiftKey;
			this.ToggleSelected( [Element],AppendSelect);

			Event.stopPropagation();
			Event.preventDefault();
		}.bind(this);
		
		//	toggle collapsable
		//	attribute only exists on collapsable objects
		if ( ValueIsChild )
		{
			Element.setAttribute('Collapsed',Meta.Collapsed==true);
		}
		
		if ( ValueIsChild )
		{
			let Collapser = document.createElement('button');
			Collapser.className = 'Collapser';
			Element.appendChild(Collapser);	
			
			Collapser.onclick = function(Event)
			{
				let Collapsed = Element.getAttribute('Collapsed') == 'true';
				Collapsed = !Collapsed;
				Element.setAttribute('Collapsed',Collapsed);
				Event.stopPropagation();
			}
		}
		
		
		let Label = Key;
		if ( Meta.KeyAsLabel )
			Label = Value[Meta.KeyAsLabel];
		let LabelElement = document.createElement('label');
		LabelElement.innerText = Label;
		Element.appendChild(LabelElement);	
		
		if ( !ValueIsChild )
		{
			let ValueElement = document.createElement('span');
			ValueElement.innertText = Value;
			Element.appendChild(ValueElement);	
		}
		*/
	}

	GetLabelElement(Key)
	{
		const Children = Array.from( this.TreeContainer.children );
		
		let Child = Children.find( e => e.id == Key );
		if ( Child )
			return Child;
			
		Child = document.createElement('div');
		this.InitialiseLabel( Key, Child );
		this.TreeContainer.appendChild(Child);
		return Child;
	}
	
	GetLabelElements()
	{
		const Children = Array.from( this.TreeContainer.children );
		return Children;
	}
	
	RemoveLabelElement(Key)
	{
		const Children = Array.from( this.TreeContainer.children );
		let Child = Children.find( e => e.id == Key );
		if ( !Child )
			return false;
		
		this.TreeContainer.removeChild(Child);
		return Child;
	}

	UpdateLabels()
	{
		//	no DOM yet
		if ( !this.TreeContainer )
			return;
			
		const Labels = this.labels;
		const LabelKeys = Object.keys(Labels);
		
		//	remove any labels that are no longer referenced
		const LabelElements = this.GetLabelElements();
		const RemovedLabelKeys = LabelElements.filter( e => !LabelKeys.some( k => e.id == k ) ).map( e => e.id );
		RemovedLabelKeys.forEach( Key => this.RemoveLabelElement.call( this, Key ) );
		
		LabelKeys.forEach( this.UpdateLabel.bind(this) );
	}
}

//	name requires dash!
window.customElements.define( UvLabelEditor.ElementName(), UvLabelEditor );

