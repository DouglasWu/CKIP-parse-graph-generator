var Lexer = function(s) {
  this.tokens = s.split(/([\(\):|])/).filter((e) => e != "");
  this.idx = 0;
  this.tok = this.tokens[this.idx];
};
Lexer.prototype.matchDelim = function(delim) {
  return delim == this.tok
};
Lexer.prototype.nextToken = function() {
  if (this.idx + 1 < this.tokens.length) {
    this.idx = this.idx + 1;
    this.tok = this.tokens[this.idx];
  }
};
Lexer.prototype.eatDelim = function(delim) {
  if (this.matchDelim(delim)) {
    this.nextToken();
    return delim;
  }
};
Lexer.prototype.eatToken = function() {
  var tok = this.tok;
  this.nextToken();
  return tok;
};
var Parser = function(query) {
  this.lex = new Lexer(query);
  this.tree = {
    pos: "",
    role: "root",
    nodes: []
  };
  this.nodeId = 0;
}
Parser.prototype.parse = function() {
  this.tree.pos = this.lex.eatToken();
  this.lex.eatDelim('(');
  this.tree.nodes = this.struct();
  this.lex.eatDelim(')');
}
Parser.prototype.struct = function() {
  var nodes = [];
  nodes.push(this.node());
  while (this.lex.matchDelim('|')) {
    this.lex.eatDelim('|');
    nodes.push(this.node());
  }
  return nodes;
}
Parser.prototype.node = function() {
  var item = {
  	id: this.nodeId,
    role: "",
    pos: "",
    nodes: ""
  };
  this.nodeId++;
  item.role = this.lex.eatToken();
  this.lex.eatDelim(':');
  item.pos = this.lex.eatToken();
  if (this.lex.matchDelim(':')) {
    this.lex.eatDelim(':');
    item.nodes = this.lex.eatToken();
  } else {
    this.lex.eatDelim('(');
    item.nodes = this.struct();
    this.lex.eatDelim(')');
  }
  return item;
}

// Return the node that can represent this subtree
// in the graph
function findHead(tree) {
	let head = tree;
	if(typeof(tree.nodes)!="string") {
    let headFound = false;
  	tree.nodes.forEach((node) => {
			if(!headFound && (node.role=="Head"||node.role=="head")) {
        head = findHead(node);
        headFound = true;
      } else if(headFound && node.role=="head") {
        // head is more important than Head
        head = findHead(node);
      }
    });
  }
  return head;
}

function findLeaves(tree, leaves) {
	tree.nodes.forEach((node) => {
  	if(typeof(node.nodes)=="string") { // leaf node
      leaves.push({id:node.id, label:node.nodes});
    } else {
     	findLeaves(node, leaves);
    }
  });
}

function buildEdges(tree, edges) {
	let head = null;
  let nonHeads = [];
  let headFound = false;
	tree.nodes.forEach((node) => {
    // there can be only one head now
  	if(!headFound && (node.role=="Head" || node.role=="head")) {
    	head = findHead(node);
      headFound = true;
    } else {
      // head is more important than Head
      if(node.role=="head" && headFound) {
        head = findHead(node);
        // push the Head into nonHeads
        nonHeads.push({head:head, label:head.role});
      } else {
        nonHeads.push({head:findHead(node), label:node.role});  
      }
    }
  	if(typeof(node.nodes)!="string") {
      buildEdges(node, edges);
    }
  });

  // add edges from head to nonheads
  nonHeads.forEach((item) => {
  	var edgeObj = {from: head.id, to: item.head.id, arrows: "to", label: item.label};
    if(item.label=="Head" || item.label=="head") {
    	edgeObj['arrows'] = '';
    }
  	edges.push(edgeObj);
  });
}