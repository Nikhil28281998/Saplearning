*&---------------------------------------------------------------------*
*& Method: TRAININGASSIGNME_DELETE_ENTITY  (SEGW may truncate the name)
*& Rejects deletion of training assignments (compliance requirement)
*& Class: ZCL_ZCOURSES_DPC_EXT (Redefine in SE24)
*&
*& IMPORTANT: Check the exact method name in SE24 → ZCL_ZCOURSES_DPC_EXT
*&   Search for method containing "TRAININGASSIGN" and "DELETE"
*&
*& This method always raises an error because assignments must NOT
*& be deleted (audit trail / compliance requirement).
*& Matches annotation: @Capabilities.DeleteRestrictions: { Deletable: false }
*&---------------------------------------------------------------------*

METHOD trainingassignme_delete_entity.

* -- Assignments are NOT deletable (compliance requirement) ----------
* -- The UI hides the delete button via annotation, but the backend
* -- must also enforce this in case of direct OData calls.
  RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
    EXPORTING
      textid  = /iwbep/cx_mgw_busi_exception=>business_error
      message = 'Deleting training assignments is not allowed'.

ENDMETHOD.
