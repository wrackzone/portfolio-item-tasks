var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    // items:{ html:'<a href="https://help.rallydev.com/apps/2.0rc3/doc/">App SDK 2.0rc3 Docs</a>'},
    config: {

        defaultSettings : {
            // query : "(State.Name = Developing)"
            portfolioItem : "G1076"
        }

    },

    getSettingsFields: function() {

        return [
            {
                name: 'portfolioItem',
                xtype: 'rallytextfield',
                label : 'Portfolio Item ID eg. F1999' // to filter initiatives eg. (State.Name = Developing)'
            }
        ];

    },

    launch: function() {
        
        app = this;

        var portfioItemID = app.getSetting("portfolioItem");

        var configs = [
            {   
            	model : "portfolioItem/Goal",
                fetch : ["ObjectID"],
                filters : [ { property:"FormattedID", operator:"=", value: portfioItemID } ]
            }
        ];

        async.map( configs, app.wsapiQuery, function(err,results) {
        	console.log("results",results[0][0]);
        	if (results[0].length < 1) {
        		Rally.ui.notify.Notifier.show({message: "ID " + portfioItemID + " not found!"});
        	} else {

        		var piObjectID = results[0][0].get("ObjectID");
        		console.log("ObjectID:",piObjectID);

        		app.querySnapshots(piObjectID);

        	}
        })

    },

    createWsapiFilter : function( ids ) {

		var filter = null;

		_.each( ids, function( id, i ) {
			var f = Ext.create('Rally.data.wsapi.Filter', {
					property : "ObjectID" , operator : '=', value : id }
			);
			filter = (i===0) ? f : filter.or(f);
		});
		return filter;
	},


    readObjectsById : function( snapshots, fieldName,displayName, model ) {

    	// eg all owner ids.
    	var ids = _.map(snapshots, function(s) { return s.get(fieldName)})
    	ids = _.uniq(_.compact(ids));

    	var filter = app.createWsapiFilter(ids);

    	var config = {
			model : model,
			fetch : [displayName],
			filters : [ filter ]
		};

		async.map([config],app.wsapiQuery, function(err,results) {
			app[model] = results[0];
			console.log(model,app[model]);
		});

    },

    querySnapshots : function( id ) {

    	var storeConfig = {
			filters : app.createSnapshotFilters( app.getContext(), id ),
			fetch   : ["FormattedID","Name","Owner","Project","State","Estimate","WorkProduct", "ToDo","_TypeHierarchy"],
			hydrate : ["_TypeHierarchy"],
			autoLoad : true,
			pageSize : 10000,
			limit    : 'Infinity',
			listeners : {
				scope : this,
				load  : function(store,snapshots,success) {
					console.log("Read snapshots:",snapshots.length);
					app.readObjectsById(snapshots,"Owner","UserName","User");
					// app.readObjectsById(snapshots,"Name","HierarchicalRequirement");
					// app.readObjectsById(snapshots,"Name","Project");

				}
			}
		};

		var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

		app.grid = Ext.create('Rally.ui.grid.Grid', {

			columnCfgs: [
                {text:'ID',dataIndex:'FormattedID'},
                {text:'Name', dataIndex: 'Name'},
                {text:'Owner', dataIndex: 'Owner', renderer : app.renderWorkProduct1 },
                {text:'Project', dataIndex: 'Project'},
                {text:'WorkProduct', dataIndex: 'WorkProduct', renderer : app.renderWorkProduct},
                {text:'State', dataIndex: 'State'},
                {text:'Estimate', dataIndex: 'Estimate'},
                {text:'ToDo', dataIndex: 'ToDo'},
                // {text:'Type',dataIndex:'_TypeHierarchy',renderer : app.renderType}
	        ],

			store: snapshotStore

		});

		app.add(app.grid);
    },

    renderWorkProduct : function( v, m, r) {
    	// console.log(v,m,r);
    	return v;
    },

	renderWorkProduct1 : function( v, m, r) {
    	console.log(v,m,r);
    	return v;
    },

    createSnapshotFilters : function( ctx, id ) {

    	return [
                {
		            property: '__At',
		            operator: '=',
		            value: "current"
		        },
				{
					property: "_ProjectHierarchy",
					operator : "in",
					value : [ctx.getProject().ObjectID]
				},
				{
					property: "_TypeHierarchy",
					operator : "in",
					value : ["Task"]
				},
				{
					property: "_ItemHierarchy",
					operator : "in",
					value : [id]
				}
    	];

    },

    // generic function to perform a web services query    
    wsapiQuery : function( config , callback ) {
    	
        Ext.create('Rally.data.WsapiDataStore', {
            autoLoad : true,
            limit : "Infinity",
            model : config.model,
            fetch : config.fetch,
            filters : config.filters,
            listeners : {
                scope : this,
                load : function(store, data) {
                    callback(null,data);
                }
            }
        });
    },
});
