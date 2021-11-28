it("executes test task", () => {
  cy.createConnection()
    .createTask()
    .then(({ url }) => {
      cy.visit(url);
    });

  cy.get('input[name="username"]').type("fake@email.com");
  cy.get('input[name="password"]').type("SuperSecret");
  cy.get('input[type="submit"]').click();

  cy.get('input[value="auth=fake@email.com:SuperSecret"]').click();

  cy.get("p").should("have.text", "urlparam=1234");

  cy.get('input[value="BB"]').click();

  cy.get('input[value="DONE"]').click();

  cy.getResult().its("status").should("eq", 200);

  cy.getResult().its("status").should("eq", 404);
});
