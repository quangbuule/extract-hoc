function extractArguments({ types, path, forDefaultExport }, node) {
  if (node.type !== 'CallExpression') {
    return;
  }

  node.arguments = node.arguments.map(node => {
    if (node.type === 'CallExpression') {
      extractArguments({ types, path, forDefaultExport }, node);
    }

    if (node.type === 'Identifier') {
      return node;
    }

    const idName = forDefaultExport ? 'default' : path.node.id.name;
    const id = path.scope.generateUidIdentifier(`${idName}_arg`);

    path.insertBefore(
      types.assignmentExpression('=', id, node)
    );

    path.scope.push({ id });

    return id;
  });
}

module.exports = function({ types }) {
  // No-op in production.
  if (process.env.NODE_ENV === 'production') {
    return {
      visitor: {}
    };
  }

  const Visitor = {
    VariableDeclarator(path) {
      if (path.parentPath.parent.type !== 'Program') {
        return;
      }
      if (!path.node.init) {
        return;
      }

      if (path.node.init.type !== 'CallExpression') {
        return;
      }

      extractArguments({ types, path }, path.node.init);
    },

    ExportDefaultDeclaration(path) {
      if (path.node.declaration.type !== 'CallExpression') {
        return;
      }

      extractArguments({
        types,
        path,
        forDefaultExport: true
      }, path.node.declaration);
    }
  };

  return {
    visitor: {
      Program: {
        enter(path) {
          path.traverse(Visitor);
        }
      }
    }
  };
};
