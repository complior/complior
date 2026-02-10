function(ctx) {
  flow_id: ctx.flow.id,
  identity_id: ctx.identity.id,
  email: ctx.identity.traits.email,
  name: ctx.identity.traits.name,
  organization_id: if std.objectHas(ctx.identity.traits, 'organization_id') then ctx.identity.traits.organization_id else null,
  locale: if std.objectHas(ctx.identity.traits, 'locale') then ctx.identity.traits.locale else 'de',
  event: 'registration',
}
