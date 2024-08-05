<svelte:options tag="fds-image-editor-adjustment-layer-toolbar" />

<script>
    import {  onMount } from "svelte"

  export let layer = {}

  onMount(async () => {
    refresh()
	})
   /**
   * put all available workflows in menu structure
   */ 
  function convertToMenuStructure(array) {
    const menu = {};

    array.forEach((item) => {
      const categoryKey = item.category.toLowerCase() + "Menu"
      const itemKey = item.name.replace(/\s+/g, "").toLowerCase()
      if (!menu[categoryKey]) {
        menu[categoryKey] = {
          name: item.category + " Options",
          items: {},
        };
      }

      menu[categoryKey].items[itemKey] = {
        workflowid: item.workflowid,
        name: item.name,
      }
    })
    return menu
  }

  function openMenu() {
    var contextMenu = window.document.createElement("fds-image-editor-menu");
    contextMenu.menu = menu;
    contextMenu.element = selectButton;
    contextMenu.callback = (name, p, item) => {
        layer.workflowid=item.workflowid
        layer.workflowname=item.name
        layer.no_preserve_transparency=item.no_preserve_transparency
        layer.formData={}
        layer.name=item.name
        layer=layer        
        globalThis.gyre.layerManager.selectLayers([layer.id])
        // open dialog
        openProperties()
//       
    }
    document.body.append(contextMenu)
  }
  function openProperties() {
    console.log("openProperties",layer)
    globalThis.gyre.openDialogById(layer.workflowid,layer.formData,layer.workflowname,(newData) => { layer.formData=newData;})
  }
  export async function executeAll() {
    let gyre=globalThis.gyre

    let layers=gyre.layerManager.getLayersSameLevel(layer.id)
    if (!layers || layers.length===1) return  // nothing below adjustment layer -> do nothing
    for(let i=layers.length-1;i>=0;i--) {      // get all adjustment layer in stack
      let l=layers[i]
      if (l.type==="fds-image-editor-adjustment-layer" && l.visible) {
        let component = l.element.getElementsByTagName("fds-image-editor-adjustment-layer")[0]
        await component.execute()
      }

    }
  }

  // helper function see below
  function countResultImageUsage(data) {
    let count = 0
    for (let key in data.mappings) {
      // eslint-disable-next-line no-prototype-builtins
      if (data.mappings.hasOwnProperty(key)) {
        data.mappings[key].forEach(mapping => {
          if (mapping.fromField === "resultImage") {
            count++
          }
        })
      }
    }
    return count
  }

  let menu = {};
  export function refresh() {
    if (!globalThis.gyre) return;
    let gyre = globalThis.gyre;
    if (!gyre.ComfyUI || !gyre.ComfyUI.workflowList) return
    // get all layer workflows which are active
    let layerWFs = gyre.ComfyUI.workflowList.filter((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        if (!gyreobj.tags || !gyreobj.tags.includes("LayerMenu")) return false
        if (gyreobj.tags && gyreobj.tags.includes("Deactivated")) return false
        if (!gyreobj.category) gyreobj.category = "Other"
        // needs currentLayer (= merged images of all layers below here)
        if (!gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","currentLayer")) return false
        // layer below or above can not work here
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","nextLayer")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","layerBelow")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","previousLayer")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"layer_image","layerAbove")) return false
        if (gyre.ComfyUI.checkFormElement(gyreobj.workflowid,"drop_layers")) return false // support later
        let num=countResultImageUsage(gyreobj)
        if (num!==1) return false // only one result image is allowed here
        return true
      }).map((el) => {
        let gyreobj = JSON.parse(el.json).extra.gyre;
        return {
          name: el.name,
          category: gyreobj.category,
          workflowid: gyreobj.workflowid,
          no_preserve_transparency: gyreobj.no_preserve_transparency
        }
      })
    menu = convertToMenuStructure(layerWFs)
  }



  let selectButton

</script>

<div>
  {#if !layer.workflowid}
  <fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon" class="icon"></fds-image-editor-button>

    Adjustment Layer:
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      on:click={openMenu}
      bind:this={selectButton}>Select Workflow...</fds-image-editor-button
    >
    {:else}
    <fds-image-editor-button icon="fds-image-editor-adjustment-layer-icon" type="icon" class="icon"></fds-image-editor-button>

    Adjustment Layer:
    {layer.workflowname} 
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      on:click={openProperties}
      bind:this={selectButton}>Properties...</fds-image-editor-button
    >    
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <fds-image-editor-button
      type="button"
      state="active"
      on:click={executeAll}
      bind:this={selectButton}>Update Layers</fds-image-editor-button
    >        

  {/if}
  
</div>
<style>
  .icon {
    vertical-align: -10px;
  }
</style>