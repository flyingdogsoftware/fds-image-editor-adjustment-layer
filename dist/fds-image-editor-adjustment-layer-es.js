
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
let src_url_equal_anchor;
function src_url_equal(element_src, url) {
    if (!src_url_equal_anchor) {
        src_url_equal_anchor = document.createElement('a');
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_style(node, key, value, important) {
    if (value == null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}
function attribute_to_object(attributes) {
    const result = {};
    for (const attribute of attributes) {
        result[attribute.name] = attribute.value;
    }
    return result;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        flush_render_callbacks($$.after_update);
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
let SvelteElement;
if (typeof HTMLElement === 'function') {
    SvelteElement = class extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            const { on_mount } = this.$$;
            this.$$.on_disconnect = on_mount.map(run).filter(is_function);
            // @ts-ignore todo: improve typings
            for (const key in this.$$.slotted) {
                // @ts-ignore todo: improve typings
                this.appendChild(this.$$.slotted[key]);
            }
        }
        attributeChangedCallback(attr, _oldValue, newValue) {
            this[attr] = newValue;
        }
        disconnectedCallback() {
            run_all(this.$$.on_disconnect);
        }
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            // TODO should this delegate to addEventListener?
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    };
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
}
function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
    const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    if (has_stop_immediate_propagation)
        modifiers.push('stopImmediatePropagation');
    dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    dispatch_dev('SvelteDOMSetData', { node: text, data });
    text.data = data;
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}

/* src/Dialog.svelte generated by Svelte v3.59.2 */

const { console: console_1$1 } = globals;
const file$1 = "src/Dialog.svelte";

// (139:4) {:else}
function create_else_block(ctx) {
	let fds_image_editor_button0;
	let t0;
	let t1_value = /*layer*/ ctx[0].workflowname + "";
	let t1;
	let t2;
	let fds_image_editor_button1;
	let t4;
	let fds_image_editor_button2;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			fds_image_editor_button0 = element("fds-image-editor-button");
			t0 = text("\n\n    Adjustment Layer:\n    ");
			t1 = text(t1_value);
			t2 = space();
			fds_image_editor_button1 = element("fds-image-editor-button");
			fds_image_editor_button1.textContent = "Properties...";
			t4 = space();
			fds_image_editor_button2 = element("fds-image-editor-button");
			fds_image_editor_button2.textContent = "Update Layers";
			set_custom_element_data(fds_image_editor_button0, "icon", "fds-image-editor-adjustment-layer-icon");
			set_custom_element_data(fds_image_editor_button0, "type", "icon");
			set_custom_element_data(fds_image_editor_button0, "class", "icon");
			add_location(fds_image_editor_button0, file$1, 139, 4, 4766);
			set_custom_element_data(fds_image_editor_button1, "type", "button");
			add_location(fds_image_editor_button1, file$1, 144, 4, 5003);
			set_custom_element_data(fds_image_editor_button2, "type", "button");
			set_custom_element_data(fds_image_editor_button2, "state", "active");
			add_location(fds_image_editor_button2, file$1, 150, 4, 5225);
		},
		m: function mount(target, anchor) {
			insert_dev(target, fds_image_editor_button0, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, t1, anchor);
			insert_dev(target, t2, anchor);
			insert_dev(target, fds_image_editor_button1, anchor);
			/*fds_image_editor_button1_binding_1*/ ctx[7](fds_image_editor_button1);
			insert_dev(target, t4, anchor);
			insert_dev(target, fds_image_editor_button2, anchor);
			/*fds_image_editor_button2_binding*/ ctx[8](fds_image_editor_button2);

			if (!mounted) {
				dispose = [
					listen_dev(fds_image_editor_button1, "click", /*openProperties*/ ctx[4], false, false, false, false),
					listen_dev(fds_image_editor_button2, "click", /*executeAll*/ ctx[1], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*layer*/ 1 && t1_value !== (t1_value = /*layer*/ ctx[0].workflowname + "")) set_data_dev(t1, t1_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(fds_image_editor_button0);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(t1);
			if (detaching) detach_dev(t2);
			if (detaching) detach_dev(fds_image_editor_button1);
			/*fds_image_editor_button1_binding_1*/ ctx[7](null);
			if (detaching) detach_dev(t4);
			if (detaching) detach_dev(fds_image_editor_button2);
			/*fds_image_editor_button2_binding*/ ctx[8](null);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(139:4) {:else}",
		ctx
	});

	return block;
}

// (129:2) {#if !layer.workflowid}
function create_if_block$1(ctx) {
	let fds_image_editor_button0;
	let t0;
	let fds_image_editor_button1;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			fds_image_editor_button0 = element("fds-image-editor-button");
			t0 = text("\n\n    Adjustment Layer:\n    \n    ");
			fds_image_editor_button1 = element("fds-image-editor-button");
			fds_image_editor_button1.textContent = "Select Workflow...";
			set_custom_element_data(fds_image_editor_button0, "icon", "fds-image-editor-adjustment-layer-icon");
			set_custom_element_data(fds_image_editor_button0, "type", "icon");
			set_custom_element_data(fds_image_editor_button0, "class", "icon");
			add_location(fds_image_editor_button0, file$1, 129, 2, 4387);
			set_custom_element_data(fds_image_editor_button1, "type", "button");
			add_location(fds_image_editor_button1, file$1, 133, 4, 4598);
		},
		m: function mount(target, anchor) {
			insert_dev(target, fds_image_editor_button0, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, fds_image_editor_button1, anchor);
			/*fds_image_editor_button1_binding*/ ctx[6](fds_image_editor_button1);

			if (!mounted) {
				dispose = listen_dev(fds_image_editor_button1, "click", /*openMenu*/ ctx[3], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(fds_image_editor_button0);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(fds_image_editor_button1);
			/*fds_image_editor_button1_binding*/ ctx[6](null);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(129:2) {#if !layer.workflowid}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let div;

	function select_block_type(ctx, dirty) {
		if (!/*layer*/ ctx[0].workflowid) return create_if_block$1;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if_block.c();
			this.c = noop;
			add_location(div, file$1, 127, 0, 4353);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if_block.m(div, null);
		},
		p: function update(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div, null);
				}
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if_block.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function convertToMenuStructure(array) {
	const menu = {};

	array.forEach(item => {
		const categoryKey = item.category.toLowerCase() + "Menu";
		const itemKey = item.name.replace(/\s+/g, "").toLowerCase();

		if (!menu[categoryKey]) {
			menu[categoryKey] = {
				name: item.category + " Options",
				items: {}
			};
		}

		menu[categoryKey].items[itemKey] = {
			workflowid: item.workflowid,
			name: item.name
		};
	});

	return menu;
}

// helper function see below
function countResultImageUsage(data) {
	let count = 0;

	for (let key in data.mappings) {
		// eslint-disable-next-line no-prototype-builtins
		if (data.mappings.hasOwnProperty(key)) {
			data.mappings[key].forEach(mapping => {
				if (mapping.fromField === "resultImage") {
					count++;
				}
			});
		}
	}

	return count;
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('fds-image-editor-adjustment-layer-toolbar', slots, []);
	let { layer = {} } = $$props;

	onMount(async () => {
		refresh();
	});

	function openMenu() {
		var contextMenu = window.document.createElement("fds-image-editor-menu");
		contextMenu.menu = menu;
		contextMenu.element = selectButton;

		contextMenu.callback = (name, p, item) => {
			$$invalidate(0, layer.workflowid = item.workflowid, layer);
			$$invalidate(0, layer.workflowname = item.name, layer);
			$$invalidate(0, layer.no_preserve_transparency = item.no_preserve_transparency, layer);
			$$invalidate(0, layer.formData = {}, layer);
			$$invalidate(0, layer.name = item.name, layer);
			$$invalidate(0, layer);
			globalThis.gyre.layerManager.selectLayers([layer.id]);

			// open dialog
			openProperties();
		}; //       

		document.body.append(contextMenu);
	}

	function openProperties() {
		console.log("openProperties", layer);

		globalThis.gyre.openDialogById(layer.workflowid, layer.formData, layer.workflowname, newData => {
			$$invalidate(0, layer.formData = newData, layer);
		});
	}

	async function executeAll() {
		let gyre = globalThis.gyre;
		let layers = gyre.layerManager.getLayersSameLevel(layer.id);
		if (!layers || layers.length === 1) return; // nothing below adjustment layer -> do nothing

		for (let i = layers.length - 1; i >= 0; i--) {
			// get all adjustment layer in stack
			let l = layers[i];

			if (l.type === "fds-image-editor-adjustment-layer" && l.visible) {
				let component = l.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0];
				await component.execute();
			}
		}
	}

	let menu = {};

	function refresh() {
		if (!globalThis.gyre) return;
		let gyre = globalThis.gyre;
		if (!gyre.ComfyUI || !gyre.ComfyUI.workflowList) return;

		// get all layer workflows which are active
		let layerWFs = gyre.ComfyUI.workflowList.filter(el => {
			let gyreobj = JSON.parse(el.json).extra.gyre;
			if (!gyreobj.tags || !gyreobj.tags.includes("LayerMenu")) return false;
			if (gyreobj.tags && gyreobj.tags.includes("Deactivated")) return false;
			if (!gyreobj.category) gyreobj.category = "Other";

			// needs currentLayer (= merged images of all layers below here)
			if (!gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "layer_image", "currentLayer")) return false;

			// layer below or above can not work here
			if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "layer_image", "nextLayer")) return false;

			if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "layer_image", "layerBelow")) return false;
			if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "layer_image", "previousLayer")) return false;
			if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "layer_image", "layerAbove")) return false;
			if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid, "drop_layers")) return false; // support later
			let num = countResultImageUsage(gyreobj);
			if (num !== 1) return false; // only one result image is allowed here
			return true;
		}).map(el => {
			let gyreobj = JSON.parse(el.json).extra.gyre;

			return {
				name: el.name,
				category: gyreobj.category,
				workflowid: gyreobj.workflowid,
				no_preserve_transparency: gyreobj.no_preserve_transparency
			};
		});

		menu = convertToMenuStructure(layerWFs);
	}

	let selectButton;
	const writable_props = ['layer'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<fds-image-editor-adjustment-layer-toolbar> was created with unknown prop '${key}'`);
	});

	function fds_image_editor_button1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			selectButton = $$value;
			$$invalidate(2, selectButton);
		});
	}

	function fds_image_editor_button1_binding_1($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			selectButton = $$value;
			$$invalidate(2, selectButton);
		});
	}

	function fds_image_editor_button2_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			selectButton = $$value;
			$$invalidate(2, selectButton);
		});
	}

	$$self.$$set = $$props => {
		if ('layer' in $$props) $$invalidate(0, layer = $$props.layer);
	};

	$$self.$capture_state = () => ({
		onMount,
		layer,
		convertToMenuStructure,
		openMenu,
		openProperties,
		executeAll,
		countResultImageUsage,
		menu,
		refresh,
		selectButton
	});

	$$self.$inject_state = $$props => {
		if ('layer' in $$props) $$invalidate(0, layer = $$props.layer);
		if ('menu' in $$props) menu = $$props.menu;
		if ('selectButton' in $$props) $$invalidate(2, selectButton = $$props.selectButton);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		layer,
		executeAll,
		selectButton,
		openMenu,
		openProperties,
		refresh,
		fds_image_editor_button1_binding,
		fds_image_editor_button1_binding_1,
		fds_image_editor_button2_binding
	];
}

class Dialog extends SvelteElement {
	constructor(options) {
		super();
		const style = document.createElement('style');
		style.textContent = `.icon{vertical-align:-10px}`;
		this.shadowRoot.appendChild(style);

		init(
			this,
			{
				target: this.shadowRoot,
				props: attribute_to_object(this.attributes),
				customElement: true
			},
			instance$1,
			create_fragment$1,
			safe_not_equal,
			{ layer: 0, executeAll: 1, refresh: 5 },
			null
		);

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return ["layer", "executeAll", "refresh"];
	}

	get layer() {
		return this.$$.ctx[0];
	}

	set layer(layer) {
		this.$$set({ layer });
		flush();
	}

	get executeAll() {
		return this.$$.ctx[1];
	}

	set executeAll(value) {
		throw new Error("<fds-image-editor-adjustment-layer-toolbar>: Cannot set read-only property 'executeAll'");
	}

	get refresh() {
		return this.$$.ctx[5];
	}

	set refresh(value) {
		throw new Error("<fds-image-editor-adjustment-layer-toolbar>: Cannot set read-only property 'refresh'");
	}
}

customElements.define("fds-image-editor-adjustment-layer-toolbar", Dialog);

/* src/App.svelte generated by Svelte v3.59.2 */

const { console: console_1 } = globals;
const file = "src/App.svelte";

// (172:0) {#if layer.url}
function create_if_block(ctx) {
	let div;
	let img;
	let img_src_value;
	let img_style_value;
	let div_style_value;
	let t;
	let if_block_anchor;
	let if_block = /*showProgress*/ ctx[3] && create_if_block_1(ctx);

	const block = {
		c: function create() {
			div = element("div");
			img = element("img");
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			if (!src_url_equal(img.src, img_src_value = /*layer*/ ctx[0].url)) attr_dev(img, "src", img_src_value);
			attr_dev(img, "style", img_style_value = "width:" + /*width*/ ctx[1] + "px;height=" + /*height*/ ctx[2] + "px");
			add_location(img, file, 174, 4, 5568);
			attr_dev(div, "style", div_style_value = "" + (/*width*/ ctx[1] + "px;height=" + /*height*/ ctx[2] + "px; position: relative"));
			add_location(div, file, 172, 4, 5452);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, img);
			insert_dev(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*layer*/ 1 && !src_url_equal(img.src, img_src_value = /*layer*/ ctx[0].url)) {
				attr_dev(img, "src", img_src_value);
			}

			if (dirty & /*width, height*/ 6 && img_style_value !== (img_style_value = "width:" + /*width*/ ctx[1] + "px;height=" + /*height*/ ctx[2] + "px")) {
				attr_dev(img, "style", img_style_value);
			}

			if (dirty & /*width, height*/ 6 && div_style_value !== (div_style_value = "" + (/*width*/ ctx[1] + "px;height=" + /*height*/ ctx[2] + "px; position: relative"))) {
				attr_dev(div, "style", div_style_value);
			}

			if (/*showProgress*/ ctx[3]) {
				if (if_block) ; else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (detaching) detach_dev(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(172:0) {#if layer.url}",
		ctx
	});

	return block;
}

// (177:4) {#if showProgress}
function create_if_block_1(ctx) {
	let div;
	let fds_image_editor_progress_bar;

	const block = {
		c: function create() {
			div = element("div");
			fds_image_editor_progress_bar = element("fds-image-editor-progress-bar");
			add_location(fds_image_editor_progress_bar, file, 176, 66, 5710);
			set_style(div, "position", "absolute");
			set_style(div, "left", "0");
			set_style(div, "top", "0");
			add_location(div, file, 176, 22, 5666);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, fds_image_editor_progress_bar);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(177:4) {#if showProgress}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let if_block_anchor;
	let if_block = /*layer*/ ctx[0].url && create_if_block(ctx);

	const block = {
		c: function create() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.c = noop;
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (/*layer*/ ctx[0].url) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

async function prepareForAI(resultLayer) {
	
}

function addLayer(newlayer) {
	newlayer.type = 'fds-image-editor-adjustment-layer';
	newlayer.name = 'Adjustment';
	newlayer.letter = "A";
	newlayer.background_type = 'transparent';
	(newlayer.workflow = "", newlayer.workflowData = {});
}

async function quickMask() {
	return null;
}

async function mergeLayers(layers, canvasObject) {
	// Create an off-screen canvas
	const offScreenCanvas = window.document.createElement('canvas');

	offScreenCanvas.width = canvasObject.width;
	offScreenCanvas.height = canvasObject.height;
	const context = offScreenCanvas.getContext('2d');

	// Clear the off-screen canvas
	context.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);

	// Load an image from a URL
	function loadImage(url) {
		return new Promise((resolve, reject) => {
				const img = new Image();
				img.crossOrigin = "Anonymous"; // This is important if images are from different origins
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = url;
			});
	}

	// Iterate over the layers starting from the bottom layer
	for (let i = layers.length - 1; i >= 0; i--) {
		const layer = layers[i];
		const img = await loadImage(layer.url);
		context.drawImage(img, layer.x, layer.y, layer.width, layer.height);
	}

	// Convert the off-screen canvas to a data URL and return it
	return offScreenCanvas.toDataURL();
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('fds-image-editor-adjustment-layer', slots, []);
	let { width = 500 } = $$props;
	let { height = 500 } = $$props;
	let { external_scene_storage = null } = $$props;
	let { layer = {} } = $$props;

	function refresh() {
		console.log("UPDATE");
		$$invalidate(0, layer);
	}

	function _destroy() {
		if (!external_scene_storage) return;
	} //  external_scene_storage.data=getScene()

	onMount(() => {
		return () => {
		};
	});

	async function prepareForSave() {
		let copy = JSON.parse(JSON.stringify(layer));
		copy.url = null;
		return copy;
	}

	function getLayerMenuHTML(l, thumbclass, thumbStyle) {
		if (!layer.workflowid) l.name = "Select Workflow...";

		// justr render a T as thumb. Could be an image as well
		let html = '<div ' + thumbclass + ' style="' + thumbStyle + ' font-size:33px;font-weight:bold;display:flex;align-content:space-between;justify-content:space-around;align-items: center;">' + '<fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon"></fds-image-editor-button>' + '</div> ' + l.name;

		return html;
	}

	let mergedImageURL;

	async function execute() {
		let gyre = globalThis.gyre;
		let layers = gyre.layerManager.getLayersSameLevel(layer.id);
		if (!layers || layers.length === 1) return; // nothing below adjustment layer -> do nothing
		let list = [];

		for (let i = layers.length - 1; i >= 0; i--) {
			// get all layers with image (url) in it below adjustment layer
			let l = layers[i];

			if (l.id === layer.id) break;
			if (l.url && l.visible) list.unshift(l);
		}

		$$invalidate(3, showProgress = true);
		await tick();
		mergedImageURL = await mergeLayers(list, gyre.canvas); // get merged image of all layers below

		let callBack_files = async (callbacktype, name, v2, v3, v4) => {
			// callback for getting files from mappings
			console.log(callbacktype, name);

			if (callbacktype === "getLayerImage" && name === "currentLayer") {
				return await mergedImageURL;
			}
		};

		let callback_error = async nodeName => {
			console.log("Error at " + nodeName);
		};

		let data = gyre.ComfyUI.convertFormData(layer.formData);
		data.currentLayer = "empty"; // !important: set default empty values for files for calling callbacks

		let executeWorkflow = () => {
			return new Promise((resolve, reject) => {
					let callback_finished = async result => {
						let img = result[0].mime + ";charset=utf-8;base64," + result[0].base64;

						// apply alpha channel to result
						if (layer.no_preserve_transparency) {
							$$invalidate(0, layer.url = img, layer);
						} else {
							$$invalidate(0, layer.url = await gyre.imageAPI.applyAlphaChannel(img, mergedImageURL), layer);
						}

						$$invalidate(3, showProgress = false);
						let component = layer.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0];
						component.refresh();
						resolve();
					};

					gyre.ComfyUI.executeWorkflowById(layer.workflowid, callback_finished, callBack_files, data, callback_error);
				});
		};

		await executeWorkflow();
	}

	let showProgress;
	const writable_props = ['width', 'height', 'external_scene_storage', 'layer'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<fds-image-editor-adjustment-layer> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('width' in $$props) $$invalidate(1, width = $$props.width);
		if ('height' in $$props) $$invalidate(2, height = $$props.height);
		if ('external_scene_storage' in $$props) $$invalidate(4, external_scene_storage = $$props.external_scene_storage);
		if ('layer' in $$props) $$invalidate(0, layer = $$props.layer);
	};

	$$self.$capture_state = () => ({
		onMount,
		Dialog,
		tick,
		width,
		height,
		external_scene_storage,
		layer,
		refresh,
		_destroy,
		prepareForAI,
		addLayer,
		prepareForSave,
		getLayerMenuHTML,
		quickMask,
		mergedImageURL,
		execute,
		mergeLayers,
		showProgress
	});

	$$self.$inject_state = $$props => {
		if ('width' in $$props) $$invalidate(1, width = $$props.width);
		if ('height' in $$props) $$invalidate(2, height = $$props.height);
		if ('external_scene_storage' in $$props) $$invalidate(4, external_scene_storage = $$props.external_scene_storage);
		if ('layer' in $$props) $$invalidate(0, layer = $$props.layer);
		if ('mergedImageURL' in $$props) mergedImageURL = $$props.mergedImageURL;
		if ('showProgress' in $$props) $$invalidate(3, showProgress = $$props.showProgress);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		layer,
		width,
		height,
		showProgress,
		external_scene_storage,
		refresh,
		prepareForAI,
		addLayer,
		prepareForSave,
		getLayerMenuHTML,
		quickMask,
		execute
	];
}

class App extends SvelteElement {
	constructor(options) {
		super();

		init(
			this,
			{
				target: this.shadowRoot,
				props: attribute_to_object(this.attributes),
				customElement: true
			},
			instance,
			create_fragment,
			safe_not_equal,
			{
				width: 1,
				height: 2,
				external_scene_storage: 4,
				layer: 0,
				refresh: 5,
				prepareForAI: 6,
				addLayer: 7,
				prepareForSave: 8,
				getLayerMenuHTML: 9,
				quickMask: 10,
				execute: 11
			},
			null
		);

		if (options) {
			if (options.target) {
				insert_dev(options.target, this, options.anchor);
			}

			if (options.props) {
				this.$set(options.props);
				flush();
			}
		}
	}

	static get observedAttributes() {
		return [
			"width",
			"height",
			"external_scene_storage",
			"layer",
			"refresh",
			"prepareForAI",
			"addLayer",
			"prepareForSave",
			"getLayerMenuHTML",
			"quickMask",
			"execute"
		];
	}

	get width() {
		return this.$$.ctx[1];
	}

	set width(width) {
		this.$$set({ width });
		flush();
	}

	get height() {
		return this.$$.ctx[2];
	}

	set height(height) {
		this.$$set({ height });
		flush();
	}

	get external_scene_storage() {
		return this.$$.ctx[4];
	}

	set external_scene_storage(external_scene_storage) {
		this.$$set({ external_scene_storage });
		flush();
	}

	get layer() {
		return this.$$.ctx[0];
	}

	set layer(layer) {
		this.$$set({ layer });
		flush();
	}

	get refresh() {
		return this.$$.ctx[5];
	}

	set refresh(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'refresh'");
	}

	get prepareForAI() {
		return prepareForAI;
	}

	set prepareForAI(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'prepareForAI'");
	}

	get addLayer() {
		return addLayer;
	}

	set addLayer(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'addLayer'");
	}

	get prepareForSave() {
		return this.$$.ctx[8];
	}

	set prepareForSave(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'prepareForSave'");
	}

	get getLayerMenuHTML() {
		return this.$$.ctx[9];
	}

	set getLayerMenuHTML(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'getLayerMenuHTML'");
	}

	get quickMask() {
		return quickMask;
	}

	set quickMask(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'quickMask'");
	}

	get execute() {
		return this.$$.ctx[11];
	}

	set execute(value) {
		throw new Error("<fds-image-editor-adjustment-layer>: Cannot set read-only property 'execute'");
	}
}

customElements.define("fds-image-editor-adjustment-layer", App);

export { App as default };
//# sourceMappingURL=fds-image-editor-adjustment-layer-es.js.map
