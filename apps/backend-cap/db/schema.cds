namespace ulhn;

entity Resources {
  key ID           : Integer;
      url          : String(500);
      role         : String(40);
      title        : String(200);
      module       : String(40);
      description  : String(1000);
      lastUpdated  : DateTime;
      sapHelpLink  : String(500);
}

entity TrainingAssignments {
  key ID           : Integer;
      title        : String(200);
      role         : String(40);
      module       : String(40);
      url          : String(500);
      dueDate      : DateTime;
      status       : String(20);
      completedAt  : DateTime;
}
