**🤖 AI INSTRUCTION**: This is a systematic handoff preparation process.
  Follow ALL steps
---

# 🧹 CONTEXT WINDOW PREPARATION

Prepare project for context window clearing by verifying documentation compliance.

## 📋 VERIFICATION CHECKLIST

### **File Compliance (OPTIMIZED)**
- **CLAUDE.md**: ✅ AI context only (streamlined, no status duplicates)
- **README.md**: ✅ Project overview only (status moved to PROJECT_STATUS.md)
- **CONTEXT_HANDOFF_PROMPT.md**: ✅ Generalized handoff process using COMPREHENSIVE_REBUILD_TODO.md
- **docs/PROJECT_STATUS.md**: ✅ Centralized progress tracking, aligned with COMPREHENSIVE_REBUILD_TODO.md
- **COMPREHENSIVE_REBUILD_TODO.md**: ✅ Single source of truth for all implementation phases
- **todos/**: ✅ Active work folder or empty (AI creates TODOs from COMPREHENSIVE_REBUILD_TODO.md)
- **archived_md/**: ✅ USER-approved content only

### **Workflow Validation**
- ✅ New AI reads 6 files → checks todos/ folder → executes existing OR proposes new TODO from COMPREHENSIVE_REBUILD_TODO.md
- ✅ COMPREHENSIVE_REBUILD_TODO.md serves as single source of truth for all phases
- ✅ AI can identify next ready subtask when todos/ folder is empty
- ✅ Context window usage optimized by proper separation of concerns

### **Documentation Consistency Checks**
- ✅ Verify all MD files reflect actual progress and current implementation status
- ✅ Ensure todos/ folder aligns with COMPREHENSIVE_REBUILD_TODO.md next ready subtask
- ✅ Check COMPREHENSIVE_REBUILD_TODO.md completed phases match archived_md/ content
- ✅ Update cross-references between CLAUDE.md, README.md, PROJECT_STATUS.md
- ✅ Verify phase completion status is consistent across all documentation

### **Archival Review (USER APPROVAL REQUIRED)**
- Identify implementation-complete phases and TODOs
- Archive completed TODO files to archived_md/todos/ (USER approval required)
- **DO NOT archive without explicit USER consent**
- Require: USER tested + USER validated + joint approval

## 🎯 DELIVERABLES
- Documentation consistency report
- All MD files updated and aligned
- Archival candidates (requiring USER approval)
- Handoff readiness confirmation

## 🚨 CRITICAL RULES
- Follow established structure (don't reorganize)
- Never archive without explicit USER consent
- Maintain separation of concerns
- Preserve all information

---

**Usage**: Copy this prompt when you need to prepare the project for context window clearing or AI handoff optimization.