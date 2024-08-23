/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ratasenlasparedesNpcSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
      console.log('error1');
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["ratasenlasparedes", "sheet", "actor", "npc"],
      //template: "systems/ratasenlasparedes/templates/actor/npc-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
        // Later you might want to return a different template
        // based on user permissions.
        if (!game.user.isGM && this.actor.limited)
            return 'systems/ratasenlasparedes/templates/actor/limited-sheet.html';
        return 'systems/ratasenlasparedes/templates/actor/npc-sheet.html';
    }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = foundry.utils.deepClone(super.getData().data);
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.type == 'npc') {
      this._prepareCharacterItems(data);
    }

    return data;
  }
  



  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(ev => this._onItemCreate(ev));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getEmbeddedDocument("Item",li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteEmbeddedDocuments("Item",[li.data("itemId")]);
      li.slideUp(200, () => this.render(false));
    });

    html.find('.rollable').click(this._onRoll.bind(this));
    
    // profesion show.
    html.find('.profesion').click( ev => {
     const profesion = this.actor.system.items.find(i => i.type == "profesion");
     if(profesion){
         const item = this.actor.getOwnedItem(profesion._id);
         item.sheet.render(true);
     }
    });
    // profesion show.
    html.find('.reputation').click( ev => {
     const reputation = this.actor.system.items.find(i => i.type == "reputation");
     if(reputation){
         const item = this.actor.getOwnedItem(reputation._id);
         item.sheet.render(true);
     }
    });
    
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createEmbeddedDocuments("Item",[itemData]);
  }
  
  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData;

    // Initialize containers.
    const gear = [];
    const profesion = [];
    const reputation = [];
    const weapon = [];
    const scar = [];
    const mean = [];
    const spell = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to profesion.
      else if (i.type === 'profesion') {
        profesion.push(i.name);
      }
      // Append to reputation.
      else if (i.type === 'reputation') {
        reputation.push(i.name);
      }
      // Append to weapons.
      else if (i.type === 'weapon') {
        weapon.push(i);
      }
      // Append to scar.
      else if (i.type === 'scar') {
        scar.push(i);
      }
      // Append to mean.
      else if (i.type === 'mean') {
        mean.push(i);
      }
      // Append to spell.
      else if (i.type === 'spell') {
        spell.push(i);
      }
    }

    // Assign and return
    actorData.gear = gear;
    actorData.system.profesion = profesion.join(",");
    actorData.system.reputation = reputation.join(",");
    actorData.weapon = weapon;
    actorData.scar = scar;
    actorData.mean = mean;
    actorData.spell = spell;
  }


  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    console.log(dataset)
    const rollType = dataset.rollType;
    
    if (!dataset.roll) return;

    if (rollType == "damage") {
      await this.damageRoll(dataset)
    } else {
      let roll = new Roll(dataset.roll, this.actor.system);
      let rollResult = await roll.roll();
              
      let messageData = {
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flags: {'ratasenlasparedes':{'text':dataset.label, 'detail': rollResult.result}},
              flavor: dataset.label,
          };
      
      rollResult.toMessage(messageData); 
    }
  }


  async damageRoll(dataset) {
      const damageMod = Array.from(this.actor.items).reduce(function (acu, current) {
                          if (current.system.type == "Efecto" && current.system.value == "Daño") {
                              acu += parseInt(current.system.mod);
                          }
                          return acu;
                      }, 0);
      const rollString = damageMod === 0 ? dataset.roll : `${dataset.roll} + (${damageMod})`; 
      const roll = new Roll(rollString);
      const label = dataset.label ? `Causa daño con su <strong>${dataset.label}</strong>.` : '';
      const attackResult = await roll.roll();
      const attackData = {
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flags: {'ratasenlasparedes':{'text':label}},
          flavor: label,
      };
          
      attackResult.toMessage(attackData);
  }
}
