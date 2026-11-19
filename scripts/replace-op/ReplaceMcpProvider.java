package replaceop;

import com.dassault_systemes.modeler.foundation.editing.MacroCommand;
import com.nomagic.magicdraw.core.Application;
import com.nomagic.magicdraw.core.Project;
import com.nomagic.magicdraw.core.project.ProjectDescriptorsFactory;
import com.nomagic.magicdraw.openapi.uml.SessionManager;
import com.nomagic.magicdraw.uml.ConvertElementInfo;
import com.nomagic.magicdraw.uml.refactor.convert.ConvertHelper;
import com.nomagic.uml2.ext.magicdraw.classes.mdkernel.Element;
import com.nomagic.uml2.ext.magicdraw.classes.mdkernel.NamedElement;
import com.samares_engineering.omf.omf_core_framework.feature.mcp.McpCategoryProvider;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Cameo Refactor &gt; Replace With, without the selection dialog.
 * Replaces every incoming reference of the source with the target, then removes the source
 * when nothing failed to update. Same flags as the product action.
 */
public class ReplaceMcpProvider implements McpCategoryProvider {

    @Override
    public String getCategory() {
        return "refactor";
    }

    @Override
    public String getDescription() {
        return "replace(source, target): Refactor > Replace With. "
            + "Retargets incoming references from source to target and removes source. "
            + "save(): writes the active project.";
    }

    @Override
    public List<String> list() {
        return List.of("replace", "save");
    }

    @Override
    public Object call(String name, Object[] args) {
        String op = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        if ("replace".equals(op)) {
            return replace(args);
        }
        if ("save".equals(op)) {
            return save();
        }
        throw new IllegalArgumentException("Unknown refactor operation: " + name);
    }

    private Map<String, Object> replace(Object[] args) {
        Element source = element(args, 0, "source");
        Element target = element(args, 1, "target");
        if (source.equals(target)) {
            throw new IllegalArgumentException("source and target are the same element");
        }
        Project project = Project.getProject(source);
        String sourceId = source.getID();
        String sourceName = nameOf(source);
        ConvertHelper helper = new ConvertHelper();
        ReplaceInfo info = new ReplaceInfo(target.getClassType(), helper);
        SessionManager.getInstance().executeInsideSession(project, "Replace With", () -> {
            ConvertHelper.loadDiagrams(source);
            helper.convert(source, target, info, new MacroCommand());
        });
        List<String> failed = new ArrayList<>();
        for (Object item : helper.getFailedToModify()) {
            if (item instanceof Element) {
                Element failedElement = (Element) item;
                failed.add(nameOf(failedElement) + " " + failedElement.getID());
            } else if (item != null) {
                failed.add(item.toString());
            }
        }
        boolean removed = project.getElementByID(sourceId) == null;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("source", sourceName);
        result.put("sourceId", sourceId);
        result.put("target", nameOf(target));
        result.put("targetId", target.getID());
        result.put("removed", removed);
        result.put("failed", failed);
        return result;
    }

    private Map<String, Object> save() {
        Project project = Application.getInstance().getProject();
        if (project == null) {
            throw new IllegalStateException("No project is open");
        }
        var projectsManager = Application.getInstance().getProjectsManager();
        var descriptor = ProjectDescriptorsFactory.getDescriptorForProject(project);
        if (descriptor == null) {
            descriptor = ProjectDescriptorsFactory.createLocalProjectDescriptor(project);
        }
        projectsManager.saveProject(descriptor, true);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("saved", true);
        result.put("file", project.getFileName());
        result.put("dirty", project.isDirty());
        return result;
    }

    private static Element element(Object[] args, int index, String role) {
        if (args == null || index >= args.length || !(args[index] instanceof Element)) {
            throw new IllegalArgumentException(role + " must be {elementId}");
        }
        return (Element) args[index];
    }

    private static String nameOf(Element element) {
        if (element instanceof NamedElement) {
            String name = ((NamedElement) element).getName();
            return name == null ? "" : name;
        }
        return element.getHumanName();
    }

    /** Incoming references only, and drop the source once every reference moved. */
    private static final class ReplaceInfo extends ConvertElementInfo {
        private final ConvertHelper helper;

        @SuppressWarnings("unchecked")
        ReplaceInfo(Class<?> targetType, ConvertHelper helper) {
            super((Class<? extends Element>) targetType);
            this.helper = helper;
            setConvertOnlyIncomingReferences(true);
        }

        @Override
        public boolean isDisposeSource() {
            return helper.getFailedToModify().isEmpty();
        }

        @Override
        public boolean isRemoveFromCollections() {
            return true;
        }
    }
}
