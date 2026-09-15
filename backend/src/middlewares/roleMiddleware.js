module.exports = (allowedRoles) => {
  return (req, res, next) => {
    // O req.user é injetado pelo authMiddleware que rodou antes.
    const userRole = req.user.role;

    // Se o papel do usuário não estiver dentro do array de papéis permitidos, bloqueia.
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Seu perfil não tem permissão para realizar esta ação.' 
      });
    }

    // Se tiver permissão, segue o fluxo para o Controller
    return next();
  };
};