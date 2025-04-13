router.get('/organizations/:id', masterAdminController.getOrganization);
router.get('/organizations/:id/stats', masterAdminController.getOrganizationStats); 