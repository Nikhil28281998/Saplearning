sap.ui.define([], function(){
  "use strict";

  function getJson(path){
    return fetch(path).then(function(r){ return r.ok ? r.json() : Promise.reject(r); });
  }

  function postJson(path, body){
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function(r){ return r.ok ? r.json().catch(function(){ return {}; }) : Promise.reject(r); });
  }

  return { getJson: getJson, postJson: postJson };
});
