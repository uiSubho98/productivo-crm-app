import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { organizationAPI } from '../../services/api';
import useThemeStore from '../../store/themeStore';
import { getColors } from '../../utils/colors';
import { Card, Spinner, ScreenHeader, EmptyState } from '../../components/ui';

function countOrgs(orgs) {
  let n = 0;
  for (const o of orgs || []) n += 1 + countOrgs(o.children);
  return n;
}

function OrgNode({ node, depth, expanded, toggle, onPress, C }) {
  const hasChildren = node.children?.length > 0;
  const isOpen = expanded.has(String(node._id));
  return (
    <View>
      <TouchableOpacity
        onPress={() => onPress?.(node)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 10, paddingRight: 10,
          paddingLeft: depth * 16 + 4,
          borderRadius: 10,
        }}
        activeOpacity={0.75}
      >
        {hasChildren ? (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); toggle(String(node._id)); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={C.textTertiary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 16 }} />
        )}
        <View style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={node.parentOrgId ? 'business-outline' : 'business'} size={16} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
              {node.name}
            </Text>
            {!node.parentOrgId && (
              <View style={{ backgroundColor: C.purpleLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: C.purple }}>MASTER</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>
            {node.memberCounts?.total || 0} members
            {node.memberCounts?.org_admin ? ` · ${node.memberCounts.org_admin} admin` : ''}
            {node.memberCounts?.employee ? ` · ${node.memberCounts.employee} emp` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
      </TouchableOpacity>
      {hasChildren && isOpen && node.children.map((child) => (
        <OrgNode key={child._id} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} onPress={onPress} C={C} />
      ))}
    </View>
  );
}

export default function OrgTreeScreen({ navigation }) {
  const { isDark } = useThemeStore();
  const C = getColors(isDark);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const res = await organizationAPI.getTree();
      const data = res.data?.data || null;
      setTree(data);
      if (data?.roots) {
        const next = new Set();
        for (const root of data.roots) for (const org of (root.orgs || [])) next.add(String(org._id));
        setExpanded(next);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load tree');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleOrgClick = (org) => {
    if (org?._id) navigation.navigate('OrganizationDetail', { orgId: org._id });
  };

  const expandAll = () => {
    if (!tree?.roots) return;
    const next = new Set();
    const walk = (orgs) => {
      for (const org of orgs) {
        next.add(String(org._id));
        if (org.children) walk(org.children);
      }
    };
    for (const root of tree.roots) walk(root.orgs || []);
    setExpanded(next);
  };

  const collapseAll = () => setExpanded(new Set());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
      >
        <ScreenHeader
          title="Org Tree"
          subtitle="Hierarchy of organizations"
          backButton
          onBack={() => navigation.goBack()}
          isDark={isDark}
        />

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}><Spinner /></View>
        ) : !tree?.roots?.length ? (
          <EmptyState icon="business-outline" title="No organizations" subtitle="Nothing to display yet." isDark={isDark} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={expandAll}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary }}>Expand all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={collapseAll}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary }}>Collapse all</Text>
              </TouchableOpacity>
            </View>

            {tree.roots.map((root, i) => {
              const totalOrgs = countOrgs(root.orgs);
              return (
                <Card key={root._id || i} isDark={isDark} style={{ marginBottom: 14 }}>
                  {(root.kind === 'superadmin' || root.kind === 'orphan') && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 10,
                    }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={root.kind === 'orphan' ? 'help-circle' : 'ribbon'} size={20} color={C.purple} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>
                          {root.name || '(unnamed)'}
                        </Text>
                        {root.email && <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>{root.email}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>{totalOrgs}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.5 }}>ORG{totalOrgs === 1 ? '' : 'S'}</Text>
                      </View>
                    </View>
                  )}
                  {root.orgs?.length ? (
                    root.orgs.map((org) => (
                      <OrgNode
                        key={org._id}
                        node={org}
                        depth={0}
                        expanded={expanded}
                        toggle={toggle}
                        onPress={handleOrgClick}
                        C={C}
                      />
                    ))
                  ) : (
                    <Text style={{ fontSize: 13, color: C.textSecondary, fontStyle: 'italic', paddingVertical: 6 }}>
                      No organizations yet.
                    </Text>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
